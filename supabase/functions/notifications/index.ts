import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

// Import Redis functions inline to avoid import issues
const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL') || ''
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Redis helper functions
async function redisExecute<T = unknown>(command: string[]): Promise<T> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis not configured')
  }

  const response = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })

  if (!response.ok) {
    throw new Error(`Redis error: ${response.status}`)
  }

  const data = await response.json()
  return data.result
}

async function redisPipeline(commands: string[][]): Promise<unknown[]> {
  const response = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })

  if (!response.ok) {
    throw new Error(`Redis pipeline error: ${response.status}`)
  }

  const results = await response.json()
  return results.map((r: any) => r.result)
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
  read: boolean
  createdAt: string
}

function errorResponse(status: number, message: string) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function successResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({ success: true, data, timestamp: new Date().toISOString() }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace('/notifications', '')
  const method = req.method

  try {
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} }
    })

    // Verify authentication
    let userId: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: claims } = await supabase.auth.getClaims(token)
      userId = claims?.claims?.sub as string || null
    }

    if (!userId) {
      return errorResponse(401, 'Authentication required')
    }

    console.log(`[Notifications] ${method} ${path} - User: ${userId}`)

    // ============= GET NOTIFICATIONS =============
    if (path === '' && method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const key = `notifications:${userId}`
      
      try {
        const results = await redisExecute<string[]>(['LRANGE', key, '0', String(limit - 1)])
        const notifications = results.map(r => JSON.parse(r))
        
        return successResponse({
          notifications,
          unreadCount: notifications.filter((n: Notification) => !n.read).length
        })
      } catch (error) {
        console.error('Failed to get notifications from Redis:', error)
        return successResponse({ notifications: [], unreadCount: 0 })
      }
    }

    // ============= GET UNREAD COUNT =============
    if (path === '/unread-count' && method === 'GET') {
      const key = `notifications:${userId}`
      
      try {
        const results = await redisExecute<string[]>(['LRANGE', key, '0', '49'])
        const notifications = results.map(r => JSON.parse(r))
        const unreadCount = notifications.filter((n: Notification) => !n.read).length
        
        return successResponse({ unreadCount })
      } catch (error) {
        return successResponse({ unreadCount: 0 })
      }
    }

    // ============= MARK AS READ =============
    if (path === '/read' && method === 'POST') {
      const body = await req.json()
      const notificationId = body.notification_id
      
      if (!notificationId) {
        return errorResponse(400, 'notification_id required')
      }

      const key = `notifications:${userId}`
      
      try {
        const results = await redisExecute<string[]>(['LRANGE', key, '0', '49'])
        const notifications = results.map(r => JSON.parse(r))
        
        const updated = notifications.map((n: Notification) => {
          if (n.id === notificationId) {
            return { ...n, read: true }
          }
          return n
        })
        
        // Rebuild the list
        await redisExecute(['DEL', key])
        
        if (updated.length > 0) {
          const commands = updated.reverse().map((n: Notification) => ['LPUSH', key, JSON.stringify(n)])
          await redisPipeline(commands)
          await redisExecute(['EXPIRE', key, String(86400 * 7)]) // 7 days
        }
        
        return successResponse({ marked: true })
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
        return errorResponse(500, 'Failed to mark as read')
      }
    }

    // ============= MARK ALL AS READ =============
    if (path === '/read-all' && method === 'POST') {
      const key = `notifications:${userId}`
      
      try {
        const results = await redisExecute<string[]>(['LRANGE', key, '0', '49'])
        const notifications = results.map(r => JSON.parse(r))
        
        const updated = notifications.map((n: Notification) => ({ ...n, read: true }))
        
        await redisExecute(['DEL', key])
        
        if (updated.length > 0) {
          const commands = updated.reverse().map((n: Notification) => ['LPUSH', key, JSON.stringify(n)])
          await redisPipeline(commands)
          await redisExecute(['EXPIRE', key, String(86400 * 7)])
        }
        
        return successResponse({ markedAll: true })
      } catch (error) {
        console.error('Failed to mark all as read:', error)
        return errorResponse(500, 'Failed to mark all as read')
      }
    }

    // ============= CLEAR ALL =============
    if (path === '/clear' && method === 'DELETE') {
      try {
        await redisExecute(['DEL', `notifications:${userId}`])
        return successResponse({ cleared: true })
      } catch (error) {
        return errorResponse(500, 'Failed to clear notifications')
      }
    }

    // ============= SEND NOTIFICATION (Admin/Teacher only) =============
    if (path === '/send' && method === 'POST') {
      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()

      if (!roleData || !['admin', 'teacher'].includes(roleData.role)) {
        return errorResponse(403, 'Admin or teacher access required')
      }

      const body = await req.json()
      const { target_user_id, target_group_id, type, title, message, data } = body

      if (!type || !title || !message) {
        return errorResponse(400, 'type, title, and message are required')
      }

      const notification: Notification = {
        id: crypto.randomUUID(),
        type,
        title,
        message,
        data,
        read: false,
        createdAt: new Date().toISOString()
      }

      let sentTo: string[] = []

      if (target_user_id) {
        // Send to specific user
        const key = `notifications:${target_user_id}`
        await redisPipeline([
          ['LPUSH', key, JSON.stringify(notification)],
          ['LTRIM', key, '0', '49'],
          ['EXPIRE', key, String(86400 * 7)]
        ])
        sentTo.push(target_user_id)
        
        // Publish for real-time
        await redisExecute(['PUBLISH', `user:${target_user_id}:notifications`, JSON.stringify(notification)])
      } else if (target_group_id) {
        // Send to all group members
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', target_group_id)
          .eq('is_approved', true)

        if (members) {
          for (const member of members) {
            const key = `notifications:${member.user_id}`
            await redisPipeline([
              ['LPUSH', key, JSON.stringify(notification)],
              ['LTRIM', key, '0', '49'],
              ['EXPIRE', key, String(86400 * 7)]
            ])
            sentTo.push(member.user_id)
            
            await redisExecute(['PUBLISH', `user:${member.user_id}:notifications`, JSON.stringify(notification)])
          }
        }
      }

      console.log(`[Notifications] Sent to ${sentTo.length} users: ${type}`)
      
      return successResponse({ sent: true, recipientCount: sentTo.length })
    }

    // ============= HEALTH CHECK =============
    if (path === '/health' && method === 'GET') {
      try {
        await redisExecute(['PING'])
        return successResponse({ status: 'healthy', redis: 'connected' })
      } catch (error) {
        return successResponse({ status: 'degraded', redis: 'disconnected' })
      }
    }

    return errorResponse(404, 'Endpoint not found')

  } catch (error) {
    console.error('[Notifications] Error:', error)
    return errorResponse(500, error instanceof Error ? error.message : 'Internal server error')
  }
})
