import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { MapPin, Mountain, Heart, Trophy, Compass, Snowflake } from "lucide-react";
import { SectionLabel } from "@/components/SectionLabel";
import { photoFor } from "@/lib/photo-for";
import { PassportMap, type PassportMapPlace } from "@/components/PassportMap";
import { eventTypeLabel } from "@/lib/event-tags";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/passport")({ component: Passport });

const fmt = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

type Trip = {
  id: string;
  event_id: string;
  notes: string | null;
  events: {
    id: string;
    title: string;
    destination: string;
    date: string;
    type: string;
    difficulty: string;
    status: string;
    location_name: string | null;
    resort_name: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

function Passport() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: trips, isLoading } = useQuery({
    queryKey: ["passport", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select(
          "id, event_id, notes, events(id, title, destination, date, type, difficulty, status, location_name, resort_name, latitude, longitude)",
        )
        .eq("user_id", user!.id)
        .eq("status", "confirmed");
      const all = (data ?? []) as unknown as Trip[];
      return all
        .filter((t) => t.events && t.events.status === "completed")
        .sort((a, b) => b.events!.date.localeCompare(a.events!.date));
    },
  });

  const stats = useMemo(() => {
    if (!trips || trips.length === 0) return null;
    const dests = new Map<
      string,
      {
        count: number;
        first: string;
        last: string;
        types: Set<string>;
        lat: number | null;
        lng: number | null;
      }
    >();
    const typeCounts: Record<string, number> = {
      snowboard: 0,
      mountain_walk: 0,
      skate: 0,
      surf: 0,
    };
    for (const t of trips) {
      const e = t.events!;
      typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1;
      const key = e.destination;
      const cur = dests.get(key);
      if (!cur)
        dests.set(key, {
          count: 1,
          first: e.date,
          last: e.date,
          types: new Set([e.type]),
          lat: e.latitude,
          lng: e.longitude,
        });
      else {
        cur.count++;
        cur.types.add(e.type);
        if (e.date < cur.first) cur.first = e.date;
        if (e.date > cur.last) cur.last = e.date;
        if (cur.lat == null && e.latitude != null) {
          cur.lat = e.latitude;
          cur.lng = e.longitude;
        }
      }
    }
    const places = Array.from(dests.entries())
      .map(([name, v]) => ({ name, ...v, types: Array.from(v.types) }))
      .sort((a, b) => b.count - a.count);
    const heartSpot = places[0];
    const first = trips[trips.length - 1].events!;
    const latest = trips[0].events!;
    const mainActivity = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];

    // Seasonal wrapped: snowboard season runs Nov–Apr (year is end-year)
    const seasonMap = new Map<
      string,
      { count: number; places: Set<string>; types: Record<string, number> }
    >();
    for (const t of trips) {
      const e = t.events!;
      const d = new Date(e.date);
      const y = d.getFullYear();
      const m = d.getMonth();
      const endYear = m >= 7 ? y + 1 : y;
      const label = `${endYear - 1}/${String(endYear).slice(-2)}`;
      const cur = seasonMap.get(label) ?? { count: 0, places: new Set<string>(), types: {} };
      cur.count++;
      cur.places.add(e.destination);
      cur.types[e.type] = (cur.types[e.type] ?? 0) + 1;
      seasonMap.set(label, cur);
    }
    const seasons = Array.from(seasonMap.entries())
      .map(([label, v]) => ({
        label,
        count: v.count,
        places: v.places.size,
        topType: Object.entries(v.types).sort((a, b) => b[1] - a[1])[0][0],
      }))
      .sort((a, b) => b.label.localeCompare(a.label));

    return {
      typeCounts,
      places,
      heartSpot,
      first,
      latest,
      mainActivity,
      total: trips.length,
      uniqueDests: places.length,
      seasons,
    };
  }, [trips]);

  const mapPlaces = useMemo<PassportMapPlace[]>(() => {
    if (!stats) return [];
    return stats.places
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        name: p.name,
        count: p.count,
        last: fmt(p.last),
        lat: p.lat as number,
        lng: p.lng as number,
      }));
  }, [stats]);

  if (loading || isLoading)
    return <div className="max-w-4xl mx-auto px-4 py-12">{t("common.loading")}</div>;

  if (!trips || trips.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto rounded-[26px] bg-ice grid place-items-center">
          <Snowflake className="w-9 h-9 text-ice-foreground" />
        </div>
        <h1 className="mt-6 font-display text-[32px] leading-[1.05] tracking-[-0.045em]">
          {t("passport.empty_title")}
        </h1>
        <p className="mt-3 text-muted-foreground">{t("passport.empty_body")}</p>
        <Link to="/trips">
          <Button size="lg" className="mt-6">
            {t("gallery.explore_trips")}
          </Button>
        </Link>
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="max-w-3xl mx-auto px-5 pt-6 pb-10 md:pt-10 md:max-w-6xl">
      {/* Passport hero */}
      <div className="relative overflow-hidden rounded-[26px] border border-[oklch(0.62_0.24_350/0.35)]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.40 0.17 5) 0%, oklch(0.34 0.07 320) 55%, oklch(0.26 0.030 295) 100%)",
          }}
        />
        <div className="relative p-[18px] md:p-8 text-primary-foreground">
          <div className="inline-flex items-center gap-[7px] text-[9.5px] font-bold uppercase tracking-[0.22em] opacity-85 whitespace-nowrap">
            <Compass className="w-[13px] h-[13px]" /> {t("passport.hero_eyebrow")}
          </div>
          <h1 className="mt-[9px] font-display text-[30px] md:text-[40px] leading-[1.0] tracking-[-0.045em]">
            {t("passport.hero_title_1")}
            <br />
            {t("passport.hero_title_2")}
          </h1>
          <div className="mt-4 grid grid-cols-4 gap-2 md:max-w-md">
            <GlassTile label={t("passport.tile_trips")} value={s.total} />
            <GlassTile label={t("passport.tile_places")} value={s.uniqueDests} />
            <GlassTile label={t("passport.tile_snow")} value={s.typeCounts.snowboard} />
            <GlassTile label={t("passport.tile_walk")} value={s.typeCounts.mountain_walk} />
          </div>
        </div>
      </div>

      {/* Season summary */}
      {s.seasons.length > 0 && (
        <section className="mt-5">
          <SectionLabel>
            {s.seasons.length > 1
              ? t("passport.seasons")
              : t("passport.season_n", { label: s.seasons[0].label })}
          </SectionLabel>
          <div className="mt-2.5 flex flex-col gap-2.5">
            {s.seasons.map((season) => (
              <div
                key={season.label}
                className="rounded-[20px] border border-[oklch(0.34_0.032_290/0.55)] bg-card px-4 py-[15px]"
              >
                {s.seasons.length > 1 && (
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {season.label}
                  </div>
                )}
                <div className={`grid grid-cols-3 gap-2.5 ${s.seasons.length > 1 ? "mt-2" : ""}`}>
                  <SeasonStat value={season.count} label={t("passport.season_trips")} />
                  <SeasonStat value={season.places} label={t("passport.season_places")} />
                  <SeasonStat
                    value={eventTypeLabel(season.topType, t)}
                    label={t("passport.season_top_vibe")}
                    isText
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Visited places */}
      <section className="mt-5">
        <SectionLabel>{t("passport.visited_places")}</SectionLabel>
        <div className="mt-2.5 flex flex-col gap-2.5">
          {s.places.map((p) => {
            const { src, look } = photoFor(p.name);
            const isHeart = p.name === s.heartSpot.name && s.heartSpot.count > 1;
            return (
              <div
                key={p.name}
                className="relative h-[86px] rounded-[20px] overflow-hidden border border-[oklch(0.34_0.032_290/0.55)]"
              >
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: look.pos, transform: `scale(${look.scale})` }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, oklch(0.16 0.014 250 / .92) 40%, oklch(0.16 0.014 250 / .35))",
                  }}
                />
                <div className="absolute inset-0 px-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display text-[19px] leading-[1.1] tracking-[-0.035em] truncate">
                      {p.name.split(",")[0].trim()}
                    </div>
                    <div className="mt-1 text-[11.5px] text-muted-foreground truncate">
                      {p.count > 1
                        ? t("passport.visits_last", { n: p.count, date: fmt(p.last) })
                        : t("passport.visit_one", { type: eventTypeLabel(p.types[0], t) })}
                    </div>
                  </div>
                  {isHeart && (
                    <span className="shrink-0 inline-flex items-center gap-[5px] px-2.5 py-[5px] rounded-full bg-primary text-[9.5px] font-bold uppercase tracking-[0.12em] whitespace-nowrap">
                      <Heart className="w-[11px] h-[11px]" /> {t("passport.heart_spot")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Map */}
      <section className="mt-5">
        <SectionLabel>{t("passport.map_title")}</SectionLabel>
        <div className="mt-2.5">
          {mapPlaces.length > 0 ? (
            <PassportMap places={mapPlaces} heightClassName="h-[160px] sm:h-[220px]" />
          ) : (
            <div className="rounded-[20px] border border-[oklch(0.34_0.032_290/0.55)] bg-card p-4 text-sm text-muted-foreground">
              {t("passport.map_empty")}
            </div>
          )}
        </div>
      </section>

      {/* Trip history */}
      <section className="mt-5">
        <SectionLabel>{t("passport.history_title")}</SectionLabel>
        <div className="mt-2.5 flex flex-col gap-2.5">
          {trips.map((trip) => {
            const e = trip.events!;
            return (
              <div
                key={trip.id}
                className="rounded-[20px] border border-[oklch(0.34_0.032_290/0.55)] bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to="/trips/$id"
                    params={{ id: e.id }}
                    className="min-w-0 truncate font-display text-lg leading-tight tracking-[-0.03em] hover:text-primary"
                  >
                    {e.title}
                  </Link>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground inline-flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {t("passport.completed")}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {e.destination}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{fmt(e.date)}</div>
                {trip.notes && (
                  <div className="mt-2 text-sm italic text-muted-foreground">"{trip.notes}"</div>
                )}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary capitalize">
                    {eventTypeLabel(e.type, t)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-ice text-ice-foreground capitalize">
                    {e.difficulty}
                  </span>
                </div>
                <TripMemoryPreview eventId={e.id} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TripMemoryPreview({ eventId }: { eventId: string }) {
  const { t } = useI18n();
  const { data: media } = useQuery({
    queryKey: ["passport-memory", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_media")
        .select("id, media_url, media_type, is_trip_cover")
        .eq("event_id", eventId)
        .eq("status", "approved")
        .order("is_trip_cover", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(4);
      return (data ?? []) as unknown as {
        id: string;
        media_url: string;
        media_type: string;
        is_trip_cover: boolean;
      }[];
    },
  });

  if (!media || media.length === 0) {
    return (
      <div className="mt-3 h-20 rounded-xl bg-gradient-to-br from-ice/30 to-secondary border border-dashed border-border grid place-items-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Mountain className="w-3.5 h-3.5" />
          {t("passport.no_memories")}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {media.map((m) => (
          <div key={m.id} className="aspect-square rounded-lg overflow-hidden bg-secondary">
            {m.media_type === "image" ? (
              <img src={m.media_url} alt="" loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <video
                src={m.media_url}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
              />
            )}
          </div>
        ))}
      </div>
      <Link
        to="/trips/$id"
        params={{ id: eventId }}
        className="text-xs text-accent hover:underline"
      >
        {t("passport.view_memories")}
      </Link>
    </div>
  );
}

function GlassTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] bg-[rgba(11,15,18,.28)] backdrop-blur-md border border-white/15 px-[9px] py-[9px]">
      <div className="text-[8.5px] font-bold uppercase tracking-[0.12em] opacity-85 whitespace-nowrap">
        {label}
      </div>
      <div className="font-display text-[21px] leading-[1.15] tracking-[-0.04em]">{value}</div>
    </div>
  );
}

function SeasonStat({
  value,
  label,
  isText,
}: {
  value: number | string;
  label: string;
  isText?: boolean;
}) {
  return (
    <div>
      <div
        className={
          isText
            ? "font-display text-[16px] leading-[1.35] tracking-[-0.03em]"
            : "font-display text-[23px] leading-[1.1] tracking-[-0.04em]"
        }
      >
        {value}
      </div>
      <div className="mt-[3px] text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap">
        {label}
      </div>
    </div>
  );
}
