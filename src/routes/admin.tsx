import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({ component: AdminOverviewPage });

function AdminOverviewPage() {
  const { ready, loading } = useAdminGuard();
  const { t } = useI18n();
  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">{t("common.loading")}</div>;

  return (
    <AdminShell title={t("admin.nav_overview")} description={t("admin.overview_desc")}>
      <OverviewSection />
    </AdminShell>
  );
}

function OverviewSection() {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const { data: stats } = useQuery({
    queryKey: ["admin-overview-stats"],
    queryFn: async () => {
      const [u, e, eUp, regPending, regConfirmed, mediaPending, seatPending, notifsUnread] =
        await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("status", "published"),
          supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("status", "published")
            .gte("date", today),
          supabase
            .from("event_registrations")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("event_registrations")
            .select("*", { count: "exact", head: true })
            .eq("status", "confirmed"),
          supabase
            .from("trip_media")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("seat_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("admin_notifications")
            .select("*", { count: "exact", head: true })
            .eq("read", false),
        ]);
      // Missing check-ins: confirmed regs for trips happening today/tomorrow without checkin
      const inTwoDays = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
      const { data: activeEvents } = await supabase
        .from("events")
        .select("id")
        .eq("status", "published")
        .gte("date", today)
        .lte("date", inTwoDays);
      const activeIds = (activeEvents ?? []).map((x) => x.id);
      let missing = 0;
      if (activeIds.length) {
        const { data: regs } = await supabase
          .from("event_registrations")
          .select("user_id, event_id")
          .in("event_id", activeIds)
          .eq("status", "confirmed");
        const { data: chk } = await supabase
          .from("trip_checkins")
          .select("user_id, event_id, meeting_point_checked_in, status")
          .in("event_id", activeIds);
        const key = (a: { user_id: string; event_id: string }) => `${a.event_id}:${a.user_id}`;
        const done = new Set(
          (chk ?? [])
            .filter(
              (c) =>
                c.meeting_point_checked_in || ["absent", "cancelled"].includes(c.status as string),
            )
            .map(key),
        );
        missing = (regs ?? []).filter((r) => !done.has(key(r))).length;
      }
      return {
        users: u.count ?? 0,
        published: e.count ?? 0,
        upcoming: eUp.count ?? 0,
        regPending: regPending.count ?? 0,
        regConfirmed: regConfirmed.count ?? 0,
        mediaPending: mediaPending.count ?? 0,
        seatPending: seatPending.count ?? 0,
        notifs: notifsUnread.count ?? 0,
        missing,
      };
    },
  });

  const alerts = [
    stats?.regPending
      ? {
          label: t("admin.alert_pending_regs"),
          value: stats.regPending,
          to: "/admin/registrations" as const,
        }
      : null,
    stats?.mediaPending
      ? {
          label: t("admin.alert_gallery_review"),
          value: stats.mediaPending,
          to: "/admin/gallery" as const,
        }
      : null,
    stats?.seatPending
      ? { label: t("admin.alert_seat_requests"), value: stats.seatPending, to: "/admin/carpool" as const }
      : null,
    stats?.missing
      ? {
          label: t("admin.alert_missing_checkins"),
          value: stats.missing,
          to: "/admin/rollcall" as const,
        }
      : null,
    stats?.notifs
      ? { label: t("admin.alert_unread_notifs"), value: stats.notifs, to: "/admin/notifications" as const }
      : null,
  ].filter(
    (
      a,
    ): a is {
      label: string;
      value: number;
      to:
        | "/admin/registrations"
        | "/admin/gallery"
        | "/admin/carpool"
        | "/admin/rollcall"
        | "/admin/notifications";
    } => a !== null,
  );

  return (
    <div>
      {!stats ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm hover:bg-destructive/10 transition-colors"
            >
              <span>{a.label}</span>
              <span className="flex items-center gap-1 font-bold">
                {a.value}
                <ChevronRight className="w-4 h-4 opacity-60" />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          {t("admin.nothing_needs_attention")}
        </div>
      )}

      <h2 className="mt-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {t("admin.dashboard")}
      </h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Stat label={t("admin.stat_users")} value={stats?.users} />
        <Stat label={t("admin.stat_published_trips")} value={stats?.published} />
        <Stat label={t("admin.stat_upcoming_trips")} value={stats?.upcoming} />
        <Stat label={t("admin.stat_confirmed_participants")} value={stats?.regConfirmed} />
        <Stat label={t("admin.stat_pending_registrations")} value={stats?.regPending} warn={!!stats?.regPending} />
        <Stat
          label={t("admin.stat_pending_gallery")}
          value={stats?.mediaPending}
          warn={!!stats?.mediaPending}
        />
        <Stat
          label={t("admin.stat_pending_seats")}
          value={stats?.seatPending}
          warn={!!stats?.seatPending}
        />
        <Stat label={t("admin.stat_missing_checkins_48h")} value={stats?.missing} warn={!!stats?.missing} />
        <Stat label={t("admin.stat_unread_notifs")} value={stats?.notifs} warn={!!stats?.notifs} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number | undefined;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-2.5",
        warn ? "border-destructive/40 bg-destructive/5" : "border-border bg-card",
      )}
    >
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">
        {label}
      </div>
      <div className="text-xl font-bold mt-0.5">{value ?? "—"}</div>
    </div>
  );
}
