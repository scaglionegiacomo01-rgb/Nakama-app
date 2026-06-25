import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Mountain,
  Users,
  Car,
  Shield,
  Heart,
  Calendar,
  ChevronRight,
  Snowflake,
  MapPin,
  Trophy,
  BookOpen,
  Bell,
  Images,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-mountain.jpg";
import { EventCard } from "@/components/EventCard";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { getRank } from "@/lib/ranks";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-muted-foreground">
        Loading…
      </div>
    );
  }
  return user ? <Dashboard /> : <VisitorHome />;
}

/* ---------------- VISITOR ---------------- */

function VisitorHome() {
  const { t } = useI18n();
  const { data: upcoming } = useQuery({
    queryKey: ["events", "preview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .gte("date", new Date().toISOString().slice(0, 10))
        .order("date")
        .limit(3);
      return data ?? [];
    },
  });

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="" className="w-full h-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
          <div className="absolute -top-32 -right-20 w-[420px] h-[420px] rounded-full bg-[oklch(0.40_0.17_5/0.35)] blur-3xl" />
          <div className="absolute top-20 -left-24 w-[360px] h-[360px] rounded-full bg-[oklch(0.62_0.24_350/0.22)] blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-4 pt-10 pb-20 md:pt-24 md:pb-32">
          <div className="flex items-center gap-3">
            <img
              src="/brand/nakama-logo-transparent.png"
              alt="Nakama"
              width={100}
              height={100}
              className="w-[100px] h-[100px] md:w-24 md:h-24 object-contain drop-shadow-[0_10px_30px_oklch(0.62_0.24_350/0.5)]"
            />
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/70 text-foreground text-xs font-semibold border border-border backdrop-blur">
              <Snowflake className="w-3.5 h-3.5" /> {t("home.badge")}
            </div>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/15 text-accent text-[11px] font-bold uppercase tracking-[0.18em] border border-accent/40">
            Nobody gets left behind.
          </div>
          <h1 className="mt-5 text-5xl md:text-7xl font-bold tracking-[-0.04em] max-w-3xl leading-[0.95]">
            {t("home.title")}
          </h1>
          <p className="mt-6 text-base md:text-xl text-muted-foreground max-w-xl leading-relaxed">
            {t("home.subtitle")}
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link to="/auth" search={{ mode: "signup" } as never}>
              <Button size="lg" className="w-full sm:w-auto">
                {t("home.cta_join")}
              </Button>
            </Link>
            <Link to="/trips">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                {t("home.cta_trips")} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Heart className="w-4 h-4 text-accent" /> Beginner-friendly
            </span>
            <span className="inline-flex items-center gap-2">
              <Car className="w-4 h-4 text-accent" /> Carpool
            </span>
            <span className="inline-flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" /> Safety first
            </span>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="max-w-6xl mx-auto px-4 py-14 md:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold">{t("home.why_title")}</h2>
          <p className="mt-4 text-muted-foreground text-base md:text-lg">{t("home.why_body")}</p>
        </div>
      </section>

      {/* HOW */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <h2 className="text-3xl md:text-4xl font-bold">{t("home.how_title")}</h2>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { n: "01", title: t("home.how_1_title"), body: t("home.how_1_body") },
              { n: "02", title: t("home.how_2_title"), body: t("home.how_2_body") },
              { n: "03", title: t("home.how_3_title"), body: t("home.how_3_body") },
              { n: "04", title: t("home.how_4_title"), body: t("home.how_4_body") },
              { n: "05", title: t("home.how_5_title"), body: t("home.how_5_body") },
              { n: "06", title: t("home.how_6_title"), body: t("home.how_6_body") },
            ].map((step) => (
              <div
                key={step.n}
                className="rounded-2xl bg-card border border-border p-5 min-h-[150px] flex flex-col"
              >
                <div className="text-xs font-mono text-accent">{step.n}</div>
                <div className="mt-2 font-display font-semibold leading-tight">
                  {step.title}
                </div>
                <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {step.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UPCOMING */}
      <section className="max-w-6xl mx-auto px-4 py-14 md:py-20">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-3xl md:text-4xl font-bold">{t("home.upcoming_title")}</h2>
          <Link to="/trips" className="text-sm font-medium hover:underline shrink-0">
            {t("home.see_all")} <ChevronRight className="inline w-4 h-4" />
          </Link>
        </div>
        {!upcoming || upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Calendar className="w-7 h-7 mx-auto text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">{t("home.no_trips")}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      {/* VALUES PREVIEW */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <h2 className="text-3xl md:text-4xl font-bold">{t("home.values_title")}</h2>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                i: Users,
                t: t("home.value_1_title"),
                d: t("home.value_1_body"),
              },
              {
                i: Mountain,
                t: t("home.value_2_title"),
                d: t("home.value_2_body"),
              },
              {
                i: Heart,
                t: t("home.value_3_title"),
                d: t("home.value_3_body"),
              },
              {
                i: Shield,
                t: t("home.value_4_title"),
                d: t("home.value_4_body"),
              },
            ].map((v) => (
              <div
                key={v.t}
                className="rounded-2xl border border-border bg-card p-5 h-full"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center">
                  <v.i className="w-5 h-5 text-primary" />
                </div>

                <div className="mt-4 font-display font-semibold">
                  {v.t}
                </div>

                <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {v.d}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Link to="/values" className="text-sm font-medium hover:underline">
              {t("nav.values")} <ChevronRight className="inline w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* SAFETY */}
      <section className="max-w-3xl mx-auto px-4 py-14 md:py-20">
        <div className="rounded-3xl bg-primary text-primary-foreground p-8 md:p-10 text-center">
          <Shield className="w-7 h-7 mx-auto opacity-90" />
          <h3 className="mt-3 text-2xl md:text-3xl font-bold">{t("home.safety_title")}</h3>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">{t("home.safety_body")}</p>
          <Link to="/auth" search={{ mode: "signup" } as never}>
            <Button variant="secondary" size="lg" className="mt-6">
              {t("home.cta_join")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ---------------- DASHBOARD ---------------- */

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
        .select("id, status, events(id, title, destination, date, type, status)")
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
        .limit(3);
      return data ?? [];
    },
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  const myActive = (myRegs ?? []).filter(
    (r) => r.events && ["pending", "confirmed", "waitlisted"].includes(r.status)
  );
  const myUpcoming = myActive
    .filter((r) => r.events!.date >= todayStr && r.events!.status !== "completed" && r.events!.status !== "cancelled")
    .sort((a, b) => a.events!.date.localeCompare(b.events!.date));
  const nextTrip = myUpcoming[0];

  const completedCount = (myRegs ?? []).filter(
    (r) => r.events && r.status === "confirmed" && r.events.status === "completed"
  ).length;
  const rank = getRank(completedCount);
  const remaining = rank.next ? Math.max(0, rank.next - completedCount) : null;

  const fullName = profile?.full_name?.trim();
  const greetingName =
    fullName ||
    profile?.username ||
    (user?.email ? user.email.split("@")[0] : "");


  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(lang === "it" ? "it-IT" : "en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  const isTripDay = nextTrip?.events?.date === todayStr;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-0 pb-10 md:pt-0">
      {/* MOUNTAIN HERO STRIP — always shows payoff */}
      <section className="relative -mx-4 md:rounded-b-3xl overflow-hidden mb-6">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        </div>
        <div className="px-4 pt-6 pb-8 md:pt-10 md:pb-12">
          <div className="flex items-center gap-3">
            <img
              src="/brand/nakama-logo-transparent.png"
              alt="Nakama"
              width={56}
              height={56}
              className="w-14 h-14 object-contain drop-shadow-[0_8px_24px_oklch(0.62_0.24_350/0.5)]"
            />
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 text-accent text-[11px] font-bold uppercase tracking-[0.18em] border border-accent/40">
              Nobody gets left behind.
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mt-5 tracking-[-0.03em]">
            {t("home.welcome")}
            {greetingName ? `, ${greetingName}` : ""}.
          </h1>
        </div>
      </section>

      {/* NEXT TRIP */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          {t("home.my_next_trip")}
        </h2>
        {nextTrip && nextTrip.events ? (
          <div className="rounded-3xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary grid place-items-center shrink-0">
                <MountainSnowSmall />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-lg leading-tight truncate">
                  {nextTrip.events.title}
                </div>
                <div className="mt-3 text-sm text-muted-foreground inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {nextTrip.events.destination}
                </div>
                <div className="mt-2 text-sm text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {fmtDate(nextTrip.events.date)}
                </div>
                <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary capitalize">
                  {t(`status.${nextTrip.status}`)}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              <Link to="/trips/$id" params={{ id: nextTrip.events.id }} className="flex-1">
                <Button className="w-full" variant={isTripDay ? "default" : "outline"}>
                  {isTripDay ? t("home.check_in_today") : t("home.open_trip")}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center">
            <Compass className="w-7 h-7 mx-auto text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">{t("home.no_planned")}</p>
            <Link to="/trips">
              <Button className="mt-4">{t("home.find_next")}</Button>
            </Link>
          </div>
        )}
      </section>

      {/* UPCOMING PUBLIC */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("home.upcoming_for_you")}
          </h2>
          <Link to="/trips" className="text-sm font-medium hover:underline">
            {t("home.see_all")} <ChevronRight className="inline w-4 h-4" />
          </Link>
        </div>
        {!upcomingPublic || upcomingPublic.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground text-center">
            {t("home.no_trips")}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {upcomingPublic.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      {/* PASSPORT PROGRESS */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          {t("home.passport_progress")}
        </h2>
        <Link to="/passport" className="block">
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center gap-4">
              <div className="text-3xl">{rank.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">{t("home.rank_current")}</div>
                <div className="font-display font-bold text-lg truncate">{rank.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t("home.rank_completed_n", { n: completedCount })}
                </div>
              </div>
              <Trophy className="w-5 h-5 text-muted-foreground" />
            </div>
            {rank.next !== null && remaining !== null && rank.nextTitle ? (
              <div className="mt-4">
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((completedCount - rank.min) / (rank.next - rank.min)) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {t("home.rank_next_in", { n: remaining, title: rank.nextTitle })}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-muted-foreground">{t("home.rank_maxed")}</div>
            )}
          </div>
        </Link>
      </section>

      {/* QUICK ACTIONS */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          {t("home.quick_actions")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction to="/profile" icon={Users} label={t("home.complete_profile")} />
          <QuickAction to="/ranks" icon={Trophy} label="Crew Ranks" />
          <QuickAction to="/gallery" icon={Images} label={t("home.view_gallery")} />
          <QuickAction to="/community" icon={Bell} label={t("nav.community")} />
        </div>

      </section>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 hover:border-primary/40 hover:bg-secondary/40 transition-colors"
    >
      <span className="w-10 h-10 rounded-xl bg-secondary grid place-items-center shrink-0">
        <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
      </span>
      <span className="font-medium text-sm leading-tight">{label}</span>
    </Link>
  );
}

function MountainSnowSmall() {
  return <Mountain className="w-6 h-6" strokeWidth={1.75} />;
}
