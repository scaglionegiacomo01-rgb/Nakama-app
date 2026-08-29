import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PhotoCard } from "@/components/PhotoCard";
import { eventTypeLabel } from "@/lib/event-tags";
import { Calendar, MapPin, Car, CheckCircle2, Search, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type TabValue = "available" | "my-trips" | "archive";
const TABS: TabValue[] = ["available", "my-trips", "archive"];
const ACTIVE_STATUSES = ["pending", "confirmed", "waitlisted"] as const;

export const Route = createFileRoute("/trips")({
  head: () => ({ meta: [{ title: "Trips — Nakama" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: TabValue; q?: string } => {
    const tab = s.tab as string | undefined;
    // "past" and "cancelled" were separate tabs before they were merged into
    // "archive" — keep old links (and bookmarks) working.
    if (tab === "past" || tab === "cancelled")
      return { tab: "archive", q: s.q as string | undefined };
    return {
      tab: TABS.includes(tab as TabValue) ? (tab as TabValue) : undefined,
      q: typeof s.q === "string" ? s.q : undefined,
    };
  },
  component: Trips,
});

const TAB_LABEL_KEY: Record<TabValue, string> = {
  available: "trips.tab_available",
  "my-trips": "trips.tab_mine",
  archive: "trips.tab_archive",
};

function Trips() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate({ from: "/trips" });
  const search = Route.useSearch();
  const tab: TabValue = search.tab ?? "available";
  const [showSearch, setShowSearch] = useState(!!search.q);
  const [query, setQuery] = useState(search.q ?? "");

  // when user logs out from "my-trips" tab, fall back to available
  useEffect(() => {
    if (!user && tab !== "available") {
      navigate({ search: { tab: "available" }, replace: true });
    }
  }, [user, tab, navigate]);

  const setTab = (v: TabValue) =>
    navigate({ search: { tab: v === "available" ? undefined : v }, replace: true });

  const openCount = useOpenTripsCount();

  return (
    <div className="max-w-3xl mx-auto px-5 pt-6 pb-10 md:pt-10 md:max-w-6xl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-nakama-coral text-[10px] font-bold uppercase tracking-[0.22em] whitespace-nowrap">
            {openCount != null ? t("trips.open_count", { n: openCount }) : t("trips.subtitle")}
          </div>
          <h1 className="mt-1 font-display text-[38px] lg:text-[46px] leading-[1.04] lg:leading-[1.0] tracking-[-0.045em]">
            {t("trips.title")}
          </h1>
        </div>
        <button
          onClick={() => setShowSearch((s) => !s)}
          className="lg:hidden w-10 h-10 rounded-full bg-secondary grid place-items-center shrink-0"
          aria-label={t("trips.search")}
        >
          {showSearch ? (
            <X className="w-[18px] h-[18px]" />
          ) : (
            <Search className="w-[18px] h-[18px]" />
          )}
        </button>
      </header>

      {showSearch && (
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("trips.search_placeholder")}
          className="lg:hidden mt-3 w-full h-11 rounded-2xl bg-secondary px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      )}

      <div className="mt-5 flex gap-5 border-b border-border">
        {TABS.map((v) => {
          const disabled = v !== "available" && !user;
          return (
            <button
              key={v}
              onClick={() => !disabled && setTab(v)}
              disabled={disabled}
              className={cn(
                "pb-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px",
                disabled && "opacity-40",
                tab === v
                  ? "border-nakama-pink text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              {t(TAB_LABEL_KEY[v])}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {tab === "available" && <AvailableList query={query} />}
        {tab === "my-trips" && user && <MyTripsList kind="active" lang={lang} />}
        {tab === "archive" && user && <MyTripsList kind="archive" lang={lang} />}
      </div>
    </div>
  );
}

function useOpenTripsCount() {
  const { data } = useQuery({
    queryKey: ["trips-open-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .gte("date", new Date().toISOString().slice(0, 10));
      return count ?? 0;
    },
  });
  return data;
}

/* ----------------- Available ----------------- */

const TYPE_FILTERS = ["snowboard", "mountain_walk", "skate", "surf"] as const;

function AvailableList({ query }: { query: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["events", "list", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .gte("date", today)
        .order("date");
      if (!events) return [];
      const counts = await supabase
        .from("event_registrations")
        .select("event_id, status")
        .in(
          "event_id",
          events.map((e) => e.id),
        );
      let myRegs: { event_id: string; status: string }[] = [];
      if (user) {
        const { data: regs } = await supabase
          .from("event_registrations")
          .select("event_id, status")
          .eq("user_id", user.id)
          .in(
            "event_id",
            events.map((e) => e.id),
          );
        myRegs = regs ?? [];
      }
      const taken = new Map<string, number>();
      counts.data?.forEach((r) => {
        if (r.status === "confirmed" || r.status === "pending")
          taken.set(r.event_id, (taken.get(r.event_id) ?? 0) + 1);
      });
      const regMap = new Map(myRegs.map((r) => [r.event_id, r.status]));
      return events.map((e) => ({
        ...e,
        spotsLeft: Math.max(0, e.max_participants - (taken.get(e.id) ?? 0)),
        myRegStatus: regMap.get(e.id),
      }));
    },
  });

  const filtered = (data ?? []).filter((e) => {
    if (typeFilter && e.type !== typeFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      if (!e.title.toLowerCase().includes(q) && !e.destination.toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[26px] bg-card border border-border h-[238px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState icon={Calendar} text={t("trips.empty_available")} />;
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 lg:flex-wrap lg:overflow-visible lg:mx-0 lg:px-0">
        <FilterChip active={typeFilter === null} onClick={() => setTypeFilter(null)}>
          {t("trips.filter_all")}
        </FilterChip>
        {TYPE_FILTERS.map((type) => (
          <FilterChip key={type} active={typeFilter === type} onClick={() => setTypeFilter(type)}>
            {eventTypeLabel(type, t)}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={Search} text={t("trips.empty_filtered")} />
        </div>
      ) : (
        <>
          <div className="lg:hidden mt-4 grid md:grid-cols-2 gap-3.5">
            {filtered.map((e) => (
              <PhotoCard key={e.id} event={e} spotsLeft={e.spotsLeft} />
            ))}
          </div>
          <DesktopAvailableGrid trips={filtered} />
        </>
      )}
    </div>
  );
}

function DesktopAvailableGrid({
  trips,
}: {
  trips: Array<
    Database["public"]["Tables"]["events"]["Row"] & { spotsLeft: number; myRegStatus?: string }
  >;
}) {
  const { t } = useI18n();
  const [hero, ...others] = trips;
  const side = others.slice(0, 2);
  const grid4 = others.slice(2, 5);
  const rest = trips.slice(6);

  return (
    <div className="hidden lg:block mt-5">
      <div className="flex gap-[22px]">
        <PhotoCard
          event={hero}
          spotsLeft={hero.spotsLeft}
          height={340}
          className="flex-1 min-w-0"
        />
        {side.length > 0 && (
          <div className="w-[330px] shrink-0 flex flex-col gap-[22px]">
            {side.map((e) => (
              <PhotoCard key={e.id} event={e} spotsLeft={e.spotsLeft} height={159} />
            ))}
          </div>
        )}
      </div>

      {(grid4.length > 0 || others.length <= 5) && (
        <div className="mt-[22px] grid grid-cols-4 gap-[18px]">
          {grid4.map((e) => (
            <PhotoCard key={e.id} event={e} spotsLeft={e.spotsLeft} height={170} />
          ))}
          <Link
            to="/community"
            className="h-[170px] rounded-[22px] border border-dashed border-border bg-card/60 flex flex-col items-center justify-center gap-2.5 text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
          >
            <span className="w-[42px] h-[42px] rounded-[14px] bg-secondary grid place-items-center">
              <Plus className="w-[19px] h-[19px]" />
            </span>
            <span className="text-[12.5px] font-semibold">{t("nav.propose_trip")}</span>
          </Link>
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-[22px] grid grid-cols-3 gap-3.5">
          {rest.map((e) => (
            <PhotoCard key={e.id} event={e} spotsLeft={e.spotsLeft} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 border",
        active
          ? "bg-foreground text-background border-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/* ----------------- My trips / Past / Cancelled ----------------- */

type RegRow = {
  id: string;
  status: string;
  created_at: string;
  needs_ride: boolean | null;
  offers_car_seats: boolean | null;
  events: {
    id: string;
    title: string;
    destination: string;
    date: string;
    type: string;
    difficulty: string;
    status: string;
    max_participants: number;
  } | null;
};

function MyTripsList({ kind, lang }: { kind: "active" | "archive"; lang: string }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-trips", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select(
          "id, status, created_at, needs_ride, offers_car_seats, events(id, title, destination, date, type, difficulty, status, max_participants)",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as RegRow[];
    },
  });

  const { data: checkins } = useQuery({
    queryKey: ["my-checkins", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_checkins")
        .select("event_id, status, meeting_point_checked_in")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const checkinByEvent = useMemo(() => {
    const m = new Map<string, { status: string; meeting: boolean }>();
    (checkins ?? []).forEach((c) =>
      m.set(c.event_id, { status: c.status, meeting: !!c.meeting_point_checked_in }),
    );
    return m;
  }, [checkins]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    const rows = (data ?? []).filter((r) => r.events);
    if (kind === "active")
      return rows
        .filter(
          (r) =>
            (ACTIVE_STATUSES as readonly string[]).includes(r.status) &&
            r.events!.date >= todayStr &&
            r.events!.status !== "completed" &&
            r.events!.status !== "cancelled",
        )
        .sort((a, b) => a.events!.date.localeCompare(b.events!.date));
    // archive — everything that's done with: past/completed trips plus the
    // ones you cancelled, most recent first.
    return rows
      .filter(
        (r) =>
          r.status === "cancelled" || r.events!.date < todayStr || r.events!.status === "completed",
      )
      .sort((a, b) => b.events!.date.localeCompare(a.events!.date));
  }, [data, kind, todayStr]);

  const cancel = async (regId: string, eventId: string) => {
    if (!user) return;
    if (!confirm(t("trips.confirm_cancel"))) return;
    const { error } = await supabase
      .from("event_registrations")
      .update({ status: "cancelled" })
      .eq("id", regId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("trip_cars").delete().eq("event_id", eventId).eq("driver_user_id", user.id);
    await supabase.from("seat_seekers").delete().eq("event_id", eventId).eq("user_id", user.id);
    toast.success(t("trip.cancelled_msg"));
    qc.invalidateQueries({ queryKey: ["my-trips"] });
    qc.invalidateQueries({ queryKey: ["my-reg", eventId] });
    qc.invalidateQueries({ queryKey: ["event-reg-count", eventId] });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl bg-card border border-border h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        text={kind === "active" ? t("trips.empty_mine") : t("trips.empty_archive")}
        cta={
          kind === "active" ? (
            <Link to="/trips" search={{ tab: undefined }}>
              <Button className="mt-4">{t("trips.browse")}</Button>
            </Link>
          ) : null
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((r) => (
        <RegCard
          key={r.id}
          reg={r}
          lang={lang}
          kind={kind}
          checkin={checkinByEvent.get(r.events!.id) ?? null}
          onCancel={() => cancel(r.id, r.events!.id)}
        />
      ))}
    </div>
  );
}

function RegCard({
  reg,
  lang,
  kind,
  checkin,
  onCancel,
}: {
  reg: RegRow;
  lang: string;
  kind: "active" | "archive";
  checkin: { status: string; meeting: boolean } | null;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const ev = reg.events!;
  const dateStr = new Date(ev.date).toLocaleDateString(lang === "it" ? "it-IT" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const statusLabel = t(`status.${reg.status}`);

  const carpoolLabel = reg.offers_car_seats
    ? t("admin.driver_fallback")
    : reg.needs_ride
      ? t("admin.needs_ride")
      : null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isTripDay = ev.date === todayStr;
  const canRejoin = reg.status === "cancelled" && ev.status === "published" && ev.date >= todayStr;

  const statusTone: Record<string, string> = {
    pending: "bg-secondary text-foreground",
    confirmed: "bg-primary/15 text-primary",
    waitlisted: "bg-accent/20 text-accent-foreground",
    cancelled: "bg-muted text-muted-foreground",
    rejected: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to="/trips/$id"
            params={{ id: ev.id }}
            className="font-display font-bold text-base md:text-lg hover:text-primary leading-tight block"
          >
            {ev.title}
          </Link>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {dateStr}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {ev.destination}
            </span>
          </div>
        </div>
        <span
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0",
            statusTone[reg.status] ?? "bg-secondary",
          )}
        >
          {statusLabel}
        </span>
      </div>

      {(carpoolLabel || (checkin && isTripDay)) && kind === "active" && (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          {carpoolLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-foreground">
              <Car className="w-3 h-3" />
              {carpoolLabel}
            </span>
          )}
          {checkin && isTripDay && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="w-3 h-3" />
              {checkin.meeting ? "Checked in" : "Check-in open"}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        {kind === "active" && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t("trips.cancel_participation")}
          </Button>
        )}
        {canRejoin && (
          <Link to="/trips/$id" params={{ id: ev.id }}>
            <Button size="sm">{t("trips.join_again")}</Button>
          </Link>
        )}
        <Link to="/trips/$id" params={{ id: ev.id }}>
          <Button size="sm" variant={kind === "active" ? "default" : "outline"}>
            {t("trips.view_details")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  text,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <Icon className="w-7 h-7 mx-auto text-muted-foreground" />
      <p className="mt-3 text-muted-foreground">{text}</p>
      {cta}
    </div>
  );
}
