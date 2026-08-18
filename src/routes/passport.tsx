import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Mountain, Heart, Sparkles, Trophy, Compass, Snowflake, Award } from "lucide-react";
import { getRank } from "@/lib/ranks";
import { PassportMap, type PassportMapPlace } from "@/components/PassportMap";

export const Route = createFileRoute("/passport")({ component: Passport });

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

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

const typeLabels: Record<string, string> = {
  snowboard: "Snowboard",
  mountain_walk: "Mountain walk",
  skate: "Skate",
  surf: "Surf",
};

function Passport() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const { data: trips, isLoading } = useQuery({
    queryKey: ["passport", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("id, event_id, notes, events(id, title, destination, date, type, difficulty, status, location_name, resort_name, latitude, longitude)")
        .eq("user_id", user!.id)
        .eq("status", "confirmed");
      const all = (data ?? []) as unknown as Trip[];
      return all
        .filter(t => t.events && t.events.status === "completed")
        .sort((a, b) => (b.events!.date.localeCompare(a.events!.date)));
    },
  });

  const stats = useMemo(() => {
    if (!trips || trips.length === 0) return null;
    const dests = new Map<string, { count: number; first: string; last: string; types: Set<string>; lat: number | null; lng: number | null }>();
    const typeCounts: Record<string, number> = { snowboard: 0, mountain_walk: 0, skate: 0, surf: 0 };
    for (const t of trips) {
      const e = t.events!;
      typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1;
      const key = e.destination;
      const cur = dests.get(key);
      if (!cur) dests.set(key, { count: 1, first: e.date, last: e.date, types: new Set([e.type]), lat: e.latitude, lng: e.longitude });
      else {
        cur.count++;
        cur.types.add(e.type);
        if (e.date < cur.first) cur.first = e.date;
        if (e.date > cur.last) cur.last = e.date;
        if (cur.lat == null && e.latitude != null) { cur.lat = e.latitude; cur.lng = e.longitude; }
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
    const seasonMap = new Map<string, { count: number; places: Set<string>; types: Record<string, number> }>();
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
      .map(([label, v]) => ({ label, count: v.count, places: v.places.size, topType: Object.entries(v.types).sort((a,b)=>b[1]-a[1])[0][0] }))
      .sort((a, b) => b.label.localeCompare(a.label));

    return { typeCounts, places, heartSpot, first, latest, mainActivity, total: trips.length, uniqueDests: places.length, seasons };
  }, [trips]);

  const mapPlaces = useMemo<PassportMapPlace[]>(() => {
    if (!stats) return [];
    return stats.places
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({ name: p.name, count: p.count, last: fmt(p.last), lat: p.lat as number, lng: p.lng as number }));
  }, [stats]);

  if (loading || isLoading) return <div className="max-w-4xl mx-auto px-4 py-12">Loading...</div>;

  if (!trips || trips.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-ice grid place-items-center">
          <Snowflake className="w-9 h-9 text-ice-foreground" />
        </div>
        <h1 className="mt-6 text-4xl font-display font-bold">Your passport is still empty</h1>
        <p className="mt-3 text-muted-foreground">Join your first trip and start collecting places, memories and mountain days.</p>
        <Link to="/trips"><Button size="lg" className="mt-6">Explore upcoming trips</Button></Link>
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
      {/* Passport header */}
      <div className="rounded-3xl bg-gradient-to-br from-primary via-summit to-ice p-6 md:p-8 text-primary-foreground shadow-xl">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] opacity-80">
          <Compass className="w-3.5 h-3.5" /> Mountain Passport
        </div>
        <h1 className="mt-2 text-3xl md:text-5xl font-display font-bold">Your mountain story</h1>
        <p className="mt-2 opacity-90 max-w-lg">Every ride, every summit, every crew you joined — it all lives here.</p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Trips" value={s.total} />
          <Stat label="Places" value={s.uniqueDests} />
          <Stat label="Snowboard" value={s.typeCounts.snowboard} />
          <Stat label="Mountain walks" value={s.typeCounts.mountain_walk} />
        </div>
      </div>

      {/* Rank */}
      {(() => {
        const r = getRank(s.total);
        const progress = r.next ? Math.min(100, ((s.total - r.min) / (r.next - r.min)) * 100) : 100;
        const remaining = r.next ? r.next - s.total : 0;
        return (
          <Section icon={Award} title="Your rank">
            <div className="rounded-2xl bg-card border border-border p-5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-3xl">{r.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-xl">{r.title}</div>
                  <div className="text-sm text-muted-foreground">{s.total} completed {s.total === 1 ? "trip" : "trips"}</div>
                </div>
              </div>
              {r.next && r.nextTitle && (
                <>
                  <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-summit transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{remaining} more {remaining === 1 ? "trip" : "trips"} until <span className="font-semibold text-foreground">{r.nextTitle}</span></p>
                </>
              )}
              <Link to="/ranks" className="mt-3 inline-block text-xs text-accent hover:underline">See all ranks →</Link>
            </div>
          </Section>
        );
      })()}

      {/* Wrapped section removed */}


      {/* Seasonal Wrapped */}
      {s.seasons.length > 0 && (
        <Section icon={Snowflake} title="Seasons">
          <div className="grid sm:grid-cols-2 gap-3">
            {s.seasons.map(season => (
              <div key={season.label} className="rounded-2xl bg-gradient-to-br from-ice/40 to-secondary border border-border p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Season</div>
                <div className="mt-1 font-display font-bold text-2xl">{season.label}</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-background/70 backdrop-blur p-2">
                    <div className="text-xl font-bold">{season.count}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Trips</div>
                  </div>
                  <div className="rounded-xl bg-background/70 backdrop-blur p-2">
                    <div className="text-xl font-bold">{season.places}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Places</div>
                  </div>
                  <div className="rounded-xl bg-background/70 backdrop-blur p-2">
                    <div className="text-sm font-semibold mt-1">{typeLabels[season.topType] ?? season.topType}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Top vibe</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Visited Places */}
      <Section icon={MapPin} title="Visited places">
        <div className="grid sm:grid-cols-2 gap-3">
          {s.places.map(p => (
            <div key={p.name} className="rounded-2xl bg-card border border-border p-5 relative overflow-hidden">
              {p.name === s.heartSpot.name && s.heartSpot.count > 1 && (
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground">
                  <Heart className="w-3 h-3" /> Heart spot
                </div>
              )}
              <div className="font-display font-bold text-lg">{p.name}</div>
              <div className="text-sm text-muted-foreground mt-1">{p.count} {p.count === 1 ? "visit" : "visits"}</div>
              <div className="text-xs text-muted-foreground mt-2">First: {fmt(p.first)} · Last: {fmt(p.last)}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.types.map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-secondary capitalize">{typeLabels[t] ?? t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Map */}
      <Section icon={Compass} title="Passport map">
        {mapPlaces.length > 0 ? (
          <PassportMap places={mapPlaces} />
        ) : (
          <div className="rounded-2xl bg-gradient-to-br from-ice/40 to-secondary border border-border p-5 text-sm text-muted-foreground">
            No location data yet for your visited places — new trips will show up here as pins on the map once their coordinates are set.
          </div>
        )}
      </Section>

      {/* Trip history */}
      <Section icon={Calendar} title="Trip history">
        <div className="space-y-3">
          {trips.map(t => {
            const e = t.events!;
            return (
              <div key={t.id} className="rounded-2xl bg-card border border-border p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <Link to="/trips/$id" params={{ id: e.id }} className="font-display font-bold text-lg hover:text-summit">{e.title}</Link>
                    <div className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" />{e.destination}</div>
                    <div className="text-sm text-muted-foreground mt-1">{fmt(e.date)}</div>
                    {t.notes && <div className="mt-2 text-sm italic text-muted-foreground">"{t.notes}"</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-summit text-primary-foreground inline-flex items-center gap-1"><Trophy className="w-3 h-3" />Completed</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary capitalize">{typeLabels[e.type] ?? e.type}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-ice text-ice-foreground capitalize">{e.difficulty}</span>
                  </div>
                </div>
                <TripMemoryPreview eventId={e.id} />
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function TripMemoryPreview({ eventId }: { eventId: string }) {
  const { data: media } = useQuery({
    queryKey: ["passport-memory", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_media" as never)
        .select("id, media_url, media_type, is_trip_cover")
        .eq("event_id", eventId)
        .eq("status", "approved")
        .order("is_trip_cover", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(4);
      return (data ?? []) as unknown as { id: string; media_url: string; media_type: string; is_trip_cover: boolean }[];
    },
  });

  if (!media || media.length === 0) {
    return (
      <div className="mt-3 h-20 rounded-xl bg-gradient-to-br from-ice/30 to-secondary border border-dashed border-border grid place-items-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Mountain className="w-3.5 h-3.5" />No memories yet</span>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {media.map(m => (
          <div key={m.id} className="aspect-square rounded-lg overflow-hidden bg-secondary">
            {m.media_type === "image" ? (
              <img src={m.media_url} alt="" loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <video src={m.media_url} className="w-full h-full object-cover" muted preload="metadata" />
            )}
          </div>
        ))}
      </div>
      <Link to="/trips/$id" params={{ id: eventId }} className="text-xs text-accent hover:underline">View memories →</Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-background/15 backdrop-blur border border-white/20 p-3">
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-2xl font-display font-bold">{value}</div>
    </div>
  );
}
function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display font-bold text-2xl inline-flex items-center gap-2"><Icon className="w-5 h-5 text-primary" />{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function Wrap({ text }: { text: string }) {
  return <div className="rounded-2xl bg-card border border-border p-4 text-sm leading-relaxed">{text}</div>;
}
