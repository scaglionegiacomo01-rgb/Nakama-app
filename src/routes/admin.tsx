import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  Users,
  Bell,
  Camera,
  Car,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ClipboardCheck,
  UserCog,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminOverviewPage });

function AdminOverviewPage() {
  const { ready, loading } = useAdminGuard();
  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">Loading...</div>;

  return (
    <AdminShell
      title="Operations dashboard"
      description="Run trips, keep the crew safe, and make sure nobody gets left behind."
    >
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

  const cards = [
    { label: "Total users", value: stats?.users, icon: Users },
    { label: "Published trips", value: stats?.published, icon: CalendarDays },
    { label: "Upcoming trips", value: stats?.upcoming, icon: CalendarDays },
    {
      label: "Pending registrations",
      value: stats?.regPending,
      icon: Users,
      warn: !!stats?.regPending,
    },
    { label: "Confirmed participants", value: stats?.regConfirmed, icon: CheckCircle2 },
    {
      label: "Pending gallery uploads",
      value: stats?.mediaPending,
      icon: Camera,
      warn: !!stats?.mediaPending,
    },
    {
      label: "Pending seat requests",
      value: stats?.seatPending,
      icon: Car,
      warn: !!stats?.seatPending,
    },
    {
      label: "Missing check-ins (next 48h)",
      value: stats?.missing,
      icon: AlertTriangle,
      warn: !!stats?.missing,
    },
    {
      label: "Unread admin notifications",
      value: stats?.notifs,
      icon: Bell,
      warn: !!stats?.notifs,
    },
  ];

  return (
    <div>
      <h2 className="text-base font-bold">Quick actions</h2>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
        <QuickAction to="/admin/trips" icon={Plus} label="Create / manage trips" />
        <QuickAction to="/admin/registrations" icon={Users} label="Registrations" />
        <QuickAction to="/admin/carpool" icon={Car} label="Carpool" />
        <QuickAction to="/admin/rollcall" icon={ClipboardCheck} label="Roll call" />
        <QuickAction to="/admin/gallery" icon={Camera} label="Gallery moderation" />
        <QuickAction to="/admin/users" icon={UserCog} label="Users" />
        <QuickAction to="/admin/exports" icon={Download} label="Exports" />
        <QuickAction to="/admin/notifications" icon={Bell} label="Notifications" />
      </div>

      <h2 className="mt-6 text-base font-bold">At a glance</h2>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-xl border p-2.5 ${c.warn ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
              <c.icon className="w-3 h-3 shrink-0" />
              {c.label}
            </div>
            <div className="text-xl font-bold mt-0.5">{c.value ?? "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-border bg-card hover:bg-secondary p-3 text-sm font-medium inline-flex items-center gap-2"
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}
