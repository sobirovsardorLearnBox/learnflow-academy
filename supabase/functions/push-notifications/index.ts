import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname.replace("/push-notifications", "");

    // GET /vapid-public-key - Return public key for subscription
    if (req.method === "GET" && path === "/vapid-public-key") {
      return new Response(
        JSON.stringify({ publicKey: vapidPublicKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /subscribe - Save push subscription
    if (req.method === "POST" && path === "/subscribe") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "No authorization header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const { endpoint, keys } = body;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return new Response(
          JSON.stringify({ error: "Invalid subscription data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upsert subscription
      const { error: upsertError } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: req.headers.get("User-Agent") || null,
        }, {
          onConflict: "user_id,endpoint",
        });

      if (upsertError) {
        console.error("Subscription save error:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to save subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Push subscription saved for user ${user.id}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /unsubscribe - Remove push subscription
    if (req.method === "POST" && path === "/unsubscribe") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "No authorization header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const { endpoint } = body;

      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", endpoint);

      if (deleteError) {
        console.error("Unsubscribe error:", deleteError);
      }

      console.log(`Push subscription removed for user ${user.id}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /send - Send push notification (admin/teacher only)
    // This stores notification in DB and triggers realtime
    if (req.method === "POST" && path === "/send") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "No authorization header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if admin or teacher
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!roleData || !["admin", "teacher"].includes(roleData.role)) {
        return new Response(
          JSON.stringify({ error: "Permission denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const { targetUserId, targetGroupId, title, message, type, data } = body;

      if (!title || !message) {
        return new Response(
          JSON.stringify({ error: "Title and message required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let userIds: string[] = [];

      if (targetUserId) {
        userIds = [targetUserId];
      } else if (targetGroupId) {
        const { data: members } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", targetGroupId)
          .eq("is_approved", true);

        userIds = members?.map((m) => m.user_id) || [];
      }

      if (userIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "No recipients found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert notifications for all recipients
      const notifications = userIds.map((userId) => ({
        user_id: userId,
        type: type || "system",
        title,
        message,
        data: data ? JSON.parse(JSON.stringify(data)) : null,
      }));

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Notification insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to send notifications" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get push subscriptions count
      const { count: subscriptionCount } = await supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true })
        .in("user_id", userIds);

      console.log(`Notifications sent to ${userIds.length} users, ${subscriptionCount || 0} have push subscriptions`);

      return new Response(
        JSON.stringify({
          success: true,
          sent: userIds.length,
          pushSubscriptions: subscriptionCount || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /send-all - Send to all users (admin only)
    if (req.method === "POST" && path === "/send-all") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "No authorization header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Admin only
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!roleData || roleData.role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const { title, message, type, data } = body;

      // Get all users
      const { data: allUsers } = await supabase
        .from("profiles")
        .select("user_id");

      if (!allUsers || allUsers.length === 0) {
        return new Response(
          JSON.stringify({ success: true, sent: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert notifications for all users
      const notifications = allUsers.map((u) => ({
        user_id: u.user_id,
        type: type || "system",
        title,
        message,
        data: data ? JSON.parse(JSON.stringify(data)) : null,
      }));

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Broadcast insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to broadcast" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Broadcast notification sent to ${allUsers.length} users`);

      return new Response(
        JSON.stringify({ success: true, sent: allUsers.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /stats - Get push subscription stats (admin only)
    if (req.method === "GET" && path === "/stats") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "No authorization header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Admin only
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!roleData || roleData.role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { count: totalSubscriptions } = await supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true });

      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      return new Response(
        JSON.stringify({
          totalSubscriptions: totalSubscriptions || 0,
          totalUsers: totalUsers || 0,
          adoptionRate: totalUsers ? ((totalSubscriptions || 0) / totalUsers * 100).toFixed(1) + "%" : "0%",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
