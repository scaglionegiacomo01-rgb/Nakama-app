import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin_/notifications")({ component: AdminNotificationsPage });

function AdminNotificationsPage() {
  const { ready, loading } = useAdminGuard();
  const { t } = useI18n();
  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">{t("common.loading")}</div>;
  return (
    <AdminShell title={t("admin.nav_notifications")} description={t("admin.notifications_desc")}>
      <NotificationsSection />
    </AdminShell>
  );
}

type AdminNotif = { id: string; type: string; event_id: string | null; payload: Record<string, unknown>; read: boolean; created_at: string };

function NotificationsSection() {
  const { t } = useI18n();
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
    if (n.type === "trip_join")
      return t("admin.notif_joined", {
        name: (p.user_name as string) ?? t("admin.notif_member_fallback"),
        trip: (p.trip_title as string) ?? t("admin.notif_trip_fallback"),
      });
    if (n.type === "media_upload")
      return t("admin.notif_media_uploaded", {
        type: (p.media_type as string) ?? t("admin.notif_media_fallback"),
        trip: (p.trip_title as string) ?? t("admin.notif_trip_fallback"),
      });
    return n.type;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t("admin.n_unread", { n: unread })}</h2>
        {unread > 0 && <Button variant="outline" size="sm" onClick={markAll}>{t("notif.mark_all_read")}</Button>}
      </div>
      <div className="mt-3 space-y-2">
        {(notifs ?? []).map(n => (
          <div key={n.id} className={`rounded-xl border p-3 flex items-start gap-3 ${n.read ? "bg-card border-border" : "bg-primary/5 border-primary/30"}`}>
            <div className="flex-1 min-w-0">
              <div className="text-sm">{summary(n)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            {n.event_id && <Link to="/admin/events/$id" params={{ id: n.event_id }} onClick={() => !n.read && markRead(n.id)}><Button size="sm" variant="outline">{t("admin.open")}</Button></Link>}
            {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>{t("admin.mark_read")}</Button>}
          </div>
        ))}
        {(notifs ?? []).length === 0 && <p className="text-muted-foreground">{t("admin.no_notifications_yet")}</p>}
      </div>
    </div>
  );
}
