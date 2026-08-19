import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: AdminOverviewPage });

function AdminOverviewPage() {
  const { ready, loading } = useAdminGuard();
  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">Loading...</div>;

  return (
    <AdminShell title="Overview" description="Everything that needs a look, at a glance.">
      <OverviewSection />
    </AdminShell>
  );
}

function OverviewSection() {
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
          label: "Pending registrations",
          value: stats.regPending,
          to: "/admin/registrations" as const,
        }
      : null,
    stats?.mediaPending
      ? {
          label: "Gallery uploads to review",
          value: stats.mediaPending,
          to: "/admin/gallery" as const,
        }
      : null,
    stats?.seatPending
      ? { label: "Seat requests waiting", value: stats.seatPending, to: "/admin/carpool" as const }
      : null,
    stats?.missing
      ? {
          label: "Missing check-ins (next 48h)",
          value: stats.missing,
          to: "/admin/rollcall" as const,
        }
      : null,
    stats?.notifs
      ? { label: "Unread notifications", value: stats.notifs, to: "/admin/notifications" as const }
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
        <p className="text-sm text-muted-foreground">Loading…</p>
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
          Nothing needs your attention right now.
        </div>
      )}

      <h2 className="mt-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Dashboard
      </h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Stat label="Users" value={stats?.users} />
        <Stat label="Published trips" value={stats?.published} />
        <Stat label="Upcoming trips" value={stats?.upcoming} />
        <Stat label="Confirmed participants" value={stats?.regConfirmed} />
        <Stat label="Pending registrations" value={stats?.regPending} warn={!!stats?.regPending} />
        <Stat
          label="Pending gallery uploads"
          value={stats?.mediaPending}
          warn={!!stats?.mediaPending}
        />
        <Stat
          label="Pending seat requests"
          value={stats?.seatPending}
          warn={!!stats?.seatPending}
        />
        <Stat label="Missing check-ins (48h)" value={stats?.missing} warn={!!stats?.missing} />
        <Stat label="Unread notifications" value={stats?.notifs} warn={!!stats?.notifs} />
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
