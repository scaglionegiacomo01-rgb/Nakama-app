import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin_/notifications")({ component: AdminNotificationsPage });

function AdminNotificationsPage() {
  const { ready, loading } = useAdminGuard();
  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">Loading...</div>;
  return (
    <AdminShell title="Notifications" description="Everything that needs an admin's attention.">
      <NotificationsSection />
    </AdminShell>
  );
}

type AdminNotif = { id: string; type: string; event_id: string | null; payload: Record<string, unknown>; read: boolean; created_at: string };

function NotificationsSection() {
  const qc = useQueryClient();
  const { data: notifs } = useQuery({
    queryKey: ["admin-notifs-full"],
    refetchInterval: 30000,
    queryFn: async () => ((await supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(200)).data ?? []) as unknown as AdminNotif[],
  });
  const unread = (notifs ?? []).filter(n => !n.read).length;
  const markRead = async (id: string) => { await supabase.from("admin_notifications").update({ read: true }).eq("id", id); qc.invalidateQueries({ queryKey: ["admin-notifs-full"] }); };
  const markAll = async () => { await supabase.from("admin_notifications").update({ read: true }).eq("read", false); qc.invalidateQueries({ queryKey: ["admin-notifs-full"] }); };

  const summary = (n: AdminNotif) => {
    const p = n.payload;
    if (n.type === "trip_join") return `${p.user_name ?? "Member"} joined ${p.trip_title ?? "a trip"}`;
    if (n.type === "media_upload") return `New ${p.media_type ?? "media"} uploaded for ${p.trip_title ?? "a trip"}`;
    return n.type;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{unread} unread</h2>
        {unread > 0 && <Button variant="outline" size="sm" onClick={markAll}>Mark all read</Button>}
      </div>
      <div className="mt-3 space-y-2">
        {(notifs ?? []).map(n => (
          <div key={n.id} className={`rounded-xl border p-3 flex items-start gap-3 ${n.read ? "bg-card border-border" : "bg-primary/5 border-primary/30"}`}>
            <div className="flex-1 min-w-0">
              <div className="text-sm">{summary(n)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            {n.event_id && <Link to="/admin/events/$id" params={{ id: n.event_id }} onClick={() => !n.read && markRead(n.id)}><Button size="sm" variant="outline">Open</Button></Link>}
            {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
          </div>
        ))}
        {(notifs ?? []).length === 0 && <p className="text-muted-foreground">No notifications yet.</p>}
      </div>
    </div>
  );
}
