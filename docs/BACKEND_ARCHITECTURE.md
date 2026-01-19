# Backend Architecture - Production Ready

## Overview

Bu loyiha 10,000+ concurrent foydalanuvchiga mo'ljallangan production-level backend arxitekturasiga ega.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    (React + Vite + TailwindCSS)                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                                 │
│              (Edge Function - api-gateway)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ Rate Limiter │ │ JWT Verify   │ │ Input Validation        │ │
│  │ 100 req/min  │ │ Auth Check   │ │ Sanitization            │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ Caching      │ │ Logging      │ │ Error Handling          │ │
│  │ In-Memory    │ │ Structured   │ │ Graceful Fallbacks      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   PostgreSQL                              │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │   │
│  │  │ 50+ Indexes │ │ RLS Policies│ │ Optimized Functions │ │   │
│  │  │ B-Tree      │ │ Per Table   │ │ CTEs + Pagination   │ │   │
│  │  │ Partial     │ │ Role-based  │ │ Materialized Stats  │ │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Supabase Auth                            │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │   │
│  │  │ JWT Tokens  │ │ Session Mgmt│ │ Role Management     │ │   │
│  │  │ Auto Refresh│ │ Persist     │ │ Admin/Teacher/      │ │   │
│  │  │             │ │             │ │ Student             │ │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Security Features

### 1. Authentication (Supabase Auth)
- JWT tokens with automatic refresh
- Session persistence in localStorage
- Device tracking and management
- Role-based access control (admin, teacher, student)

### 2. Row Level Security (RLS)
Har bir jadvalda quyidagi policy'lar mavjud:
- Anonymous access block
- Owner-based access
- Role-based access (admin, teacher, student)
- Group membership verification

### 3. Rate Limiting
```javascript
Default: 100 requests/minute
Strict:  10 requests/minute (admin endpoints)
Auth:    5 requests/minute (login attempts)
```

### 4. Input Validation
- UUID format validation
- Email format validation
- String length limits
- Number range validation
- XSS prevention (sanitization)

## Database Optimization

### Indexes (50+ indexes)
```sql
-- User lookups
idx_profiles_user_id, idx_profiles_email

-- Role checks (RLS optimization)
idx_user_roles_user_id_role

-- Group operations
idx_groups_teacher_id
idx_group_members_group_user
idx_group_members_user_approved

-- Progress tracking (leaderboard)
idx_lesson_progress_user_completed
idx_lesson_progress_completed_at
idx_user_progress_user_completed

-- Content navigation
idx_lessons_unit_number
idx_units_level_number
idx_levels_section_number
```

### Optimized Functions
1. **get_student_leaderboard_optimized** - Pagination, CTEs, efficient joins
2. **get_group_leaderboard_optimized** - Group-specific with ranking
3. **get_user_rank** - O(n) rank calculation
4. **get_dashboard_stats** - Aggregated stats in single query

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | System health check |
| `/leaderboard` | GET | No | Global leaderboard (paginated) |
| `/leaderboard?group_id=` | GET | No | Group leaderboard |
| `/user-rank` | GET | Yes | Current user's rank |
| `/dashboard-stats` | GET | Admin/Teacher | Aggregated statistics |
| `/progress/sync` | POST | Yes | Sync lesson progress |
| `/quiz/check` | POST | Yes | Validate quiz answer |

## Caching Strategy

### Server-Side (Edge Function)
- In-memory cache with TTL
- Leaderboard: 30 seconds
- Dashboard stats: 60 seconds
- Automatic invalidation on updates

### Client-Side (React Query)
- Stale time: 30-60 seconds
- GC time: 1-2 minutes
- Fallback to direct Supabase on API failure

## Error Handling

```javascript
// Structured error responses
{
  "success": false,
  "error": "Rate limit exceeded",
  "details": { "retryAfter": 45 },
  "timestamp": "2026-01-19T00:00:00.000Z"
}
```

## Logging

Structured JSON logs for monitoring:
```json
{
  "level": "info",
  "type": "request",
  "method": "GET",
  "path": "/leaderboard",
  "status": 200,
  "duration": 45,
  "userId": "uuid",
  "timestamp": "2026-01-19T00:00:00.000Z"
}
```

## Deployment Recommendations

### For 10,000+ Users:

1. **Connection Pooling**: Supabase handles this automatically with PgBouncer

2. **Edge Function Scaling**: Deno Deploy auto-scales

3. **CDN**: Cloudflare (already integrated with Supabase)

4. **Monitoring**:
   - Edge Function logs in Lovable Cloud
   - Database query performance in pg_stat_statements
   - Rate limit metrics in logs

5. **Database Maintenance**:
   - VACUUM ANALYZE weekly
   - Monitor slow queries
   - Review index usage

## File Structure

```
supabase/
├── config.toml              # Function configurations
├── functions/
│   ├── api-gateway/
│   │   └── index.ts         # Main API gateway
│   ├── _shared/
│   │   ├── cache.ts         # Caching utilities
│   │   ├── logger.ts        # Structured logging
│   │   ├── rate-limiter.ts  # Rate limiting
│   │   ├── responses.ts     # Response helpers
│   │   └── validation.ts    # Input validation
│   ├── create-user/
│   │   └── index.ts         # User creation
│   └── setup-first-admin/
│       └── index.ts         # Initial setup

src/
├── lib/
│   └── api-client.ts        # Frontend API client
└── hooks/
    └── useOptimizedLeaderboard.ts  # Optimized hooks
```

## Performance Benchmarks (Expected)

| Operation | Target | Notes |
|-----------|--------|-------|
| Leaderboard fetch | <100ms | Cached |
| User auth check | <50ms | JWT validation |
| Progress sync | <200ms | DB write + cache invalidation |
| Dashboard stats | <300ms | Aggregated query |
