import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, RotateCcw, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { checkinLabel, TripPicker, Stat } from "@/lib/admin-shared";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin_/rollcall")({ component: AdminRollCallPage });

function AdminRollCallPage() {
  const { ready, loading } = useAdminGuard();
  const { t } = useI18n();
  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">{t("common.loading")}</div>;
  return (
    <AdminShell title={t("admin.nav_rollcall")} description={t("admin.rollcall_desc")}>
      <RollCallSection />
    </AdminShell>
  );
}

function RollCallSection() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [tripId, setTripId] = useState<string | null>(null);
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["admin-rollcall", tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const [regs, checkins, event] = await Promise.all([
        supabase.from("event_registrations").select("*").eq("event_id", tripId!).eq("status", "confirmed"),
        supabase.from("trip_checkins").select("*").eq("event_id", tripId!),
        supabase.from("events").select("title, date, status").eq("id", tripId!).maybeSingle(),
      ]);
      const userIds = (regs.data ?? []).map(r => r.user_id);
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name, username, phone, profile_picture_url").in("user_id", userIds)
        : { data: [] };
      return { regs: regs.data ?? [], checkins: checkins.data ?? [], profiles: profiles ?? [], event: event.data };
    },
  });

  const setStatusFor = async (uid: string, patch: Record<string, unknown>) => {
    if (!tripId || !user) return;
    const existing = data?.checkins.find(c => c.user_id === uid);
    if (existing) {
      const { error } = await supabase.from("trip_checkins").update({ ...patch, marked_by_admin: true, admin_marked_by: user.id }).eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("trip_checkins").insert({ event_id: tripId, user_id: uid, marked_by_admin: true, admin_marked_by: user.id, ...patch });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["admin-rollcall"] });
  };
  const sendReminders = async () => {
    if (!tripId) return;
    const { data, error } = await supabase.rpc("send_checkin_reminders", { _event_id: tripId });
    if (error) return toast.error(error.message);
    toast.success(t("admin.toast_reminder_sent_n", { n: data ?? 0 }));
  };

  const counts = useMemo(() => {
    const regs = data?.regs ?? [];
    const get = (uid: string) => data?.checkins.find(c => c.user_id === uid);
    let checkedIn = 0, missing = 0, absent = 0, returned = 0;
    for (const r of regs) {
      const c = get(r.user_id);
      if (!c || c.status === "not_checked_in") missing++;
      else if (c.status === "absent") absent++;
      else if (c.status === "returned") returned++;
      else checkedIn++;
    }
    return { total: regs.length, checkedIn, missing, absent, returned };
  }, [data]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <TripPicker value={tripId} onChange={setTripId} />
        {tripId && <Button variant="outline" onClick={sendReminders}><Send className="w-4 h-4 mr-1" />{t("admin.send_reminders")}</Button>}
      </div>
      {!tripId && <p className="mt-4 text-muted-foreground">{t("admin.pick_trip_to_open_rollcall")}</p>}
      {tripId && (
        <>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
            <Stat label={t("admin.stat_confirmed")} value={counts.total} />
            <Stat label={t("admin.stat_checked_in")} value={counts.checkedIn} />
            <Stat label={t("admin.stat_missing")} value={counts.missing} warn={counts.missing > 0} />
            <Stat label={t("admin.stat_absent")} value={counts.absent} warn={counts.absent > 0} />
            <Stat label={t("admin.stat_returned")} value={counts.returned} />
          </div>
          {data?.event?.status !== "completed" && counts.missing + counts.absent > 0 && (
            <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
              {t("admin.not_completed_warning")}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {(data?.regs ?? []).map(r => {
              const p = data?.profiles.find(x => x.user_id === r.user_id);
              const c = data?.checkins.find(x => x.user_id === r.user_id);
              const status = c?.status ?? "not_checked_in";
              return (
                <div key={r.user_id} className="rounded-2xl bg-card border border-border p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex gap-3 min-w-0">
                    <UserAvatar url={p?.profile_picture_url ?? undefined} name={p?.full_name ?? undefined} size="md" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{p?.full_name ?? p?.username}</div>
                      <div className="text-xs text-muted-foreground">{p?.phone ?? t("admin.no_phone")} · <span className="capitalize">{checkinLabel(status, t)}</span></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setStatusFor(r.user_id, { meeting_point_checked_in: true })}><CheckCircle2 className="w-3 h-3 mr-1" />{t("admin.mark_arrived")}</Button>
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setStatusFor(r.user_id, { destination_checked_in: true, meeting_point_checked_in: true })}>{t("admin.mark_at_resort")}</Button>
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setStatusFor(r.user_id, { return_checked_in: true, destination_checked_in: true, meeting_point_checked_in: true })}>{t("admin.mark_returned")}</Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-destructive" onClick={() => setStatusFor(r.user_id, { status: "absent" })}><XCircle className="w-3 h-3 mr-1" />{t("admin.mark_absent")}</Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setStatusFor(r.user_id, { status: "not_checked_in", meeting_point_checked_in: false, destination_checked_in: false, return_checked_in: false })}><RotateCcw className="w-3 h-3" /></Button>
                  </div>
                </div>
              );
            })}
            {data?.regs.length === 0 && <p className="text-sm text-muted-foreground">{t("admin.no_confirmed_yet")}</p>}
          </div>
        </>
      )}
    </div>
  );
}
