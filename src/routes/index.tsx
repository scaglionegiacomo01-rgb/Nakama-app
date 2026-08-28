import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-mountain.jpg";
import { PhotoCard } from "@/components/PhotoCard";
import { TripTicket } from "@/components/TripTicket";
import { SectionLabel } from "@/components/SectionLabel";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { getRank } from "@/lib/ranks";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-16 text-muted-foreground">Loading…</div>;
  }
  return user ? <Dashboard /> : <VisitorHome />;
}

/* ---------------- VISITOR ---------------- */
/* One screen, one promise, one CTA — the informational sections (why it
   exists, how it works, values) live at their own routes and stay linked
   from the footer/nav; they no longer duplicate here. */

function VisitorHome() {
  const { t } = useI18n();

  const { data: riderCount } = useQuery({
    queryKey: ["stats-riders"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: openTripsCount } = useQuery({
    queryKey: ["stats-open-trips"],
    queryFn: async () => {
      const { count } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .gte("date", new Date().toISOString().slice(0, 10));
      return count ?? 0;
    },
  });

  return (
    <div className="relative min-h-[calc(100dvh-5rem)] md:min-h-[calc(100dvh-4rem)] flex flex-col overflow-hidden -mt-20 md:-mt-16 pt-20 md:pt-16">
      <div className="absolute inset-0 -z-10">
        <img src={heroImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/55 to-background" />
      </div>

      <div className="flex-1 flex flex-col justify-end max-w-xl mx-auto w-full px-5 md:px-0 pb-10 md:pb-16">
        <div className="nk-rise inline-flex items-center self-start px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-[0.18em]">
          Nobody gets left behind
        </div>
        <h1 className="nk-rise-2 mt-5 font-display text-[54px] leading-[0.98] tracking-[-0.05em]">
          {t("home.title")}
        </h1>
        <p className="nk-rise-3 mt-4 text-[15.5px] text-muted-foreground max-w-[300px] leading-relaxed">
          {t("home.subtitle")}
        </p>
        <div className="nk-rise-3 mt-7 flex flex-col sm:flex-row gap-2.5">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" className="nk-sheen w-full sm:w-auto">
              {t("home.cta_join")}
            </Button>
          </Link>
          <Link to="/trips">
            <Button
              size="lg"
              variant="outline"
              className="nakama-glass w-full sm:w-auto border-white/20"
            >
              {t("home.cta_trips")} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="mt-9 pt-5 border-t border-white/12 flex items-center gap-6 text-sm">
          <Stat value={riderCount ?? "—"} label={t("home.stat_riders")} />
          <Stat value={openTripsCount ?? "—"} label={t("home.stat_open_trips")} />
          <Stat value="0" label={t("home.stat_left_behind")} />
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div className="font-display text-xl leading-none tracking-[-0.03em]">{value}</div>
      <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap">
        {label}
      </div>
    </div>
  );
}

/* ---------------- DASHBOARD (Oggi) ---------------- */

type DashTrip = {
  id: string;
  status: string;
  events: {
    id: string;
    title: string;
    destination: string;
    date: string;
    type: string;
    status: string;
    meeting_point: string | null;
    departure_time: string | null;
    max_participants: number;
  } | null;
};

function Dashboard() {
  const { user } = useAuth();
  const { t, lang } = useI18n();

  const { data: profile } = useQuery({
    queryKey: ["profile-mini", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username, profile_picture_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: myRegs } = useQuery({
    queryKey: ["dashboard-regs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select(
          "id, status, events(id, title, destination, date, type, status, meeting_point, departure_time, max_participants)",
        )
        .eq("user_id", user!.id);
      return (data ?? []) as unknown as DashTrip[];
    },
  });

  const { data: upcomingPublic } = useQuery({
    queryKey: ["dashboard-upcoming"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .gte("date", new Date().toISOString().slice(0, 10))
        .order("date")
        .limit(4);
      return data ?? [];
    },
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  const myActive = (myRegs ?? []).filter(
    (r) => r.events && ["pending", "confirmed", "waitlisted"].includes(r.status),
  );
  const myUpcoming = myActive
    .filter(
      (r) =>
        r.events!.date >= todayStr &&
        r.events!.status !== "completed" &&
        r.events!.status !== "cancelled",
    )
    .sort((a, b) => a.events!.date.localeCompare(b.events!.date));
  const nextTrip = myUpcoming[0];

  const { data: nextTripCrew } = useQuery({
    queryKey: ["next-trip-crew", nextTrip?.events?.id],
    enabled: !!nextTrip?.events?.id,
    queryFn: async () => {
      const eventId = nextTrip!.events!.id;
      const { data: regs, count } = await supabase
        .from("event_registrations")
        .select("user_id", { count: "exact" })
        .eq("event_id", eventId)
        .in("status", ["pending", "confirmed"]);
      const ids = (regs ?? []).map((r) => r.user_id).slice(0, 4);
      if (ids.length === 0) return { avatars: [], total: count ?? 0 };
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, profile_picture_url")
        .in("user_id", ids);
      const avatars = ids.map((uid) => {
        const p = profs?.find((pr) => pr.user_id === uid);
        return { url: p?.profile_picture_url ?? null, name: p?.full_name ?? p?.username ?? null };
      });
      return { avatars, total: count ?? 0 };
    },
  });

  const completedCount = (myRegs ?? []).filter(
    (r) => r.events && r.status === "confirmed" && r.events.status === "completed",
  ).length;
  const rank = getRank(completedCount);
  const remaining = rank.next ? Math.max(0, rank.next - completedCount) : null;

  const fullName = profile?.full_name?.trim();
  const greetingName =
    fullName || profile?.username || (user?.email ? user.email.split("@")[0] : "");

  const todayLabel = new Date()
    .toLocaleDateString(lang === "it" ? "it-IT" : "en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .toUpperCase();

  const rail = upcomingPublic?.filter((e) => e.id !== nextTrip?.events?.id).slice(0, 3) ?? [];

  return (
    <div className="max-w-3xl mx-auto px-5 pt-6 pb-10">
      <SectionLabel tone="coral">
        {todayLabel} · {t("home.season")}
      </SectionLabel>
      <h1 className="nk-rise mt-2 font-display text-[36px] leading-[1.02] tracking-[-0.045em]">
        {t("home.welcome")}
        {greetingName ? `,` : ""}
        {greetingName && <br />}
        {greetingName}.
      </h1>

      {/* NEXT TRIP — the ticket */}
      <div className="nk-rise-2 mt-6">
        {nextTrip && nextTrip.events ? (
          <TripTicket
            event={nextTrip.events}
            statusLabel={t(`status.${nextTrip.status}`).toUpperCase()}
            spotsLeft={
              nextTripCrew
                ? Math.max(0, nextTrip.events.max_participants - nextTripCrew.total)
                : undefined
            }
            crew={nextTripCrew?.avatars ?? []}
            crewExtra={
              nextTripCrew ? Math.max(0, nextTripCrew.total - nextTripCrew.avatars.length) : 0
            }
          />
        ) : (
          <div className="rounded-[26px] border border-dashed border-border bg-card p-6 text-center">
            <p className="text-muted-foreground">{t("home.no_planned")}</p>
            <Link to="/trips">
              <Button className="mt-4">{t("home.find_next")}</Button>
            </Link>
          </div>
        )}
      </div>

      {/* IN ARRIVO — horizontal rail */}
      {rail.length > 0 && (
        <div className="nk-rise-3 mt-8">
          <SectionLabel action={{ label: t("home.see_all"), to: "/trips" }}>
            {t("home.upcoming_for_you")}
          </SectionLabel>
          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 -mx-5 px-5">
            {rail.map((e) => (
              <PhotoCard key={e.id} event={e} height={100} className="w-[168px] shrink-0" />
            ))}
          </div>
        </div>
      )}

      {/* RANK STRIP */}
      <Link to="/passport" className="block nk-rise-3 mt-6">
        <div className="rounded-[20px] bg-card border border-[oklch(0.34_0.032_290/0.5)] px-4 py-3.5 flex items-center gap-3.5">
          <div className="text-[42px] leading-none shrink-0">{rank.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-base leading-tight whitespace-nowrap truncate">
                {rank.title}
              </div>
              {rank.next !== null && (
                <div className="text-xs text-muted-foreground shrink-0">
                  {completedCount}/{rank.next}
                </div>
              )}
            </div>
            {rank.next !== null && remaining !== null && rank.nextTitle ? (
              <>
                <div className="mt-1.5 h-[5px] rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[oklch(0.40_0.17_5)] to-[oklch(0.62_0.24_350)]"
                    style={{
                      width: `${Math.min(100, Math.round(((completedCount - rank.min) / (rank.next - rank.min)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="mt-1.5 text-xs text-muted-foreground">
                  {t("home.rank_next_in", { n: remaining, title: rank.nextTitle })}
                </div>
              </>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground">{t("home.rank_maxed")}</div>
            )}
          </div>
          <Trophy className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </Link>
    </div>
  );
}
