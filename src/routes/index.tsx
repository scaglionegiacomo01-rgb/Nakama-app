import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ChevronRight, Send, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-mountain.jpg";
import { PhotoCard } from "@/components/PhotoCard";
import { TripTicket } from "@/components/TripTicket";
import { SectionLabel } from "@/components/SectionLabel";
import { UserAvatar } from "@/components/UserAvatar";
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
    price_estimate: number | null;
    cover_image_url: string | null;
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
          "id, status, events(id, title, destination, date, type, status, meeting_point, departure_time, max_participants, price_estimate, cover_image_url)",
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

  const completedTrips = (myRegs ?? []).filter(
    (r) => r.events && r.status === "confirmed" && r.events.status === "completed",
  );
  const completedCount = completedTrips.length;
  const rank = getRank(completedCount);
  const remaining = rank.next ? Math.max(0, rank.next - completedCount) : null;
  const completedPlaces = new Set(
    completedTrips.map((r) => r.events!.destination.split(",")[0].trim()),
  );

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
    <>
      <div className="lg:hidden max-w-3xl mx-auto px-5 pt-6 pb-10">
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

      {/* ---- Desktop (lg+) ---- */}
      <div className="hidden lg:block max-w-6xl mx-auto px-8 pt-8 pb-10">
        <SectionLabel tone="coral">
          {todayLabel} · {t("home.season")}
        </SectionLabel>
        <h1 className="mt-2 font-display text-[46px] leading-[1.0] tracking-[-0.05em]">
          {t("home.welcome")}
          {greetingName ? `, ${greetingName}.` : "."}
        </h1>

        <div className="mt-[22px] flex gap-[26px] items-start">
          <div className="flex-1 min-w-0">
            {nextTrip && nextTrip.events ? (
              <TripTicket
                orientation="horizontal"
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
                priceEstimate={nextTrip.events.price_estimate}
              />
            ) : (
              <div className="rounded-[26px] border border-dashed border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">{t("home.no_planned")}</p>
                <Link to="/trips">
                  <Button className="mt-4">{t("home.find_next")}</Button>
                </Link>
              </div>
            )}

            {rail.length > 0 && (
              <div className="mt-[26px]">
                <SectionLabel action={{ label: t("home.see_all"), to: "/trips" }}>
                  {t("home.upcoming_for_you")}
                </SectionLabel>
                <div className="mt-3.5 grid grid-cols-3 gap-4">
                  {rail.map((e) => (
                    <PhotoCard key={e.id} event={e} height={186} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-[296px] shrink-0 flex flex-col gap-4">
            <RankWidget rank={rank} completedCount={completedCount} remaining={remaining} />
            <CommunityWidget />
            <PassportWidget
              stamped={completedPlaces.size}
              total={Math.max(4, completedPlaces.size)}
            />
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Desktop widgets ---------------- */

function RankWidget({
  rank,
  completedCount,
  remaining,
}: {
  rank: ReturnType<typeof getRank>;
  completedCount: number;
  remaining: number | null;
}) {
  const { t } = useI18n();
  return (
    <Link
      to="/passport"
      className="block rounded-[22px] border border-[oklch(0.34_0.032_290/0.55)] bg-card p-[18px]"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground whitespace-nowrap">
          {t("ranks.your_rank")}
        </span>
        {rank.next !== null && (
          <span className="text-[11.5px] text-muted-foreground">
            {completedCount}/{rank.next}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-[13px]">
        <span className="w-[46px] h-[46px] rounded-[15px] bg-secondary grid place-items-center text-[21px] shrink-0">
          {rank.emoji}
        </span>
        <div className="min-w-0">
          <div className="font-display text-[19px] leading-[1.15] tracking-[-0.035em] whitespace-nowrap truncate">
            {rank.title}
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            {t("home.rank_completed_n", { n: completedCount })}
          </div>
        </div>
      </div>
      {rank.next !== null && remaining !== null && rank.nextTitle ? (
        <>
          <div className="mt-3.5 h-[6px] rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[oklch(0.40_0.17_5)] to-[oklch(0.62_0.24_350)]"
              style={{
                width: `${Math.min(100, Math.round(((completedCount - rank.min) / (rank.next - rank.min)) * 100))}%`,
              }}
            />
          </div>
          <div className="mt-2 text-[11.5px] text-muted-foreground">
            {t("home.rank_next_in", { n: remaining, title: rank.nextTitle })}
          </div>
        </>
      ) : (
        <div className="mt-2 text-[11.5px] text-muted-foreground">{t("home.rank_maxed")}</div>
      )}
    </Link>
  );
}

type WidgetMsg = { id: string; user_id: string; message: string };
type WidgetProfile = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  profile_picture_url: string | null;
};

function CommunityWidget() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [text, setText] = useState("");

  const { data: messages } = useQuery({
    queryKey: ["community-widget-messages"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("community_messages")
        .select("id, user_id, message")
        .order("created_at", { ascending: false })
        .limit(2);
      return ((data ?? []) as unknown as WidgetMsg[]).reverse();
    },
  });

  const userIds = messages?.map((m) => m.user_id) ?? [];
  const { data: profiles } = useQuery({
    queryKey: ["community-widget-profiles", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, profile_picture_url")
        .in("user_id", userIds);
      return (data ?? []) as unknown as WidgetProfile[];
    },
  });
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const send = async () => {
    const msg = text.trim();
    if (!msg || !user) return;
    setText("");
    await supabase.from("community_messages").insert({ user_id: user.id, message: msg });
  };

  return (
    <div className="rounded-[22px] border border-[oklch(0.34_0.032_290/0.55)] bg-card p-[18px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground whitespace-nowrap">
          {t("nav.community")}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] text-nakama-coral whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-nakama-coral nk-pulse" />
          LIVE
        </span>
      </div>
      <div className="mt-3.5 flex flex-col gap-3.5">
        {(messages ?? []).length === 0 ? (
          <p className="text-[12px] text-muted-foreground">{t("home.community_empty")}</p>
        ) : (
          messages!.map((m) => {
            const p = profileMap.get(m.user_id);
            const name = p?.username ? `@${p.username}` : (p?.full_name ?? "Member");
            return (
              <div key={m.id} className="flex gap-2.5">
                <UserAvatar
                  url={p?.profile_picture_url}
                  name={p?.full_name ?? p?.username}
                  className="h-8 w-8 text-[11px] shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold truncate">{name}</div>
                  <div className="mt-0.5 text-[12px] leading-[1.4] text-muted-foreground line-clamp-2">
                    {m.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-[15px] h-10 rounded-[13px] bg-secondary/60 border border-border flex items-center gap-2 px-3.5"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("home.write_to_crew")}
          className="flex-1 min-w-0 bg-transparent text-[12.5px] focus:outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label="Send"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

const STAMP_EMOJI = ["🏂", "❄️", "🏔️", "🎿", "🏕️", "🥾"];

function PassportWidget({ stamped, total }: { stamped: number; total: number }) {
  const { t } = useI18n();
  const slots = Array.from({ length: 4 });
  return (
    <Link
      to="/passport"
      className="block rounded-[22px] border border-[oklch(0.34_0.032_290/0.55)] bg-card p-[18px]"
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground whitespace-nowrap">
        {t("nav.passport")}
      </span>
      <div className="mt-[13px] grid grid-cols-4 gap-[9px]">
        {slots.map((_, i) =>
          i < stamped ? (
            <div
              key={i}
              className="aspect-square rounded-full grid place-items-center text-[15px] border border-[oklch(0.62_0.24_350/0.45)]"
              style={{
                background: "linear-gradient(135deg, oklch(0.40 0.17 5), oklch(0.30 0.12 350))",
              }}
            >
              {STAMP_EMOJI[i % STAMP_EMOJI.length]}
            </div>
          ) : (
            <div
              key={i}
              className="aspect-square rounded-full bg-secondary border border-dashed border-border grid place-items-center text-muted-foreground"
            >
              {i === stamped && <Plus className="w-[15px] h-[15px]" />}
            </div>
          ),
        )}
      </div>
      <div className="mt-3 text-[11.5px] text-muted-foreground">
        {t("home.stamps_caption", { stamped, total, season: t("home.season") })}
      </div>
    </Link>
  );
}
