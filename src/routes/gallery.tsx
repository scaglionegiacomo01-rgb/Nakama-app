import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Camera, MapPin, Calendar, Sparkles, ImageIcon, Play } from "lucide-react";

export const Route = createFileRoute("/gallery")({ component: Gallery });

type Media = {
  id: string; event_id: string; user_id: string; media_url: string;
  media_type: "image" | "video"; caption: string | null; status: string;
  is_trip_cover: boolean; is_featured: boolean; created_at: string;
  events?: { id: string; title: string; destination: string; date: string; status: string } | null;
};

function Gallery() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
  if (!loading && !user) {
    navigate({ to: "/auth", search: { mode: "login" } as never });
  }
}, [user, loading, navigate]);

  const { data: approved } = useQuery({
    queryKey: ["gallery-approved"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_media" as never)
        .select("*, events(id, title, destination, date, status)")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(200);
      return ((data ?? []) as unknown as Media[]).filter(m => m.events);
    },
  });

  const { data: myEventIds } = useQuery({
    queryKey: ["gallery-my-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("event_registrations").select("event_id").eq("user_id", user!.id).eq("status", "confirmed");
      return (data ?? []).map(r => r.event_id);
    },
  });

  const grouped = useMemo(() => {
    if (!approved) return [];
    const map = new Map<string, { event: NonNullable<Media["events"]>; media: Media[]; cover?: Media }>();
    for (const m of approved) {
      const e = m.events!;
      const g = map.get(e.id) ?? { event: e, media: [] };
      g.media.push(m);
      if (m.is_trip_cover && !g.cover) g.cover = m;
      map.set(e.id, g);
    }
    return Array.from(map.values()).map(g => ({
      ...g,
      cover: g.cover ?? g.media.find(m => m.media_type === "image") ?? g.media[0],
    })).sort((a, b) => b.event.date.localeCompare(a.event.date));
  }, [approved]);

  const myMedia = useMemo(() => {
    if (!approved || !myEventIds) return [];
    const set = new Set(myEventIds);
    return grouped.filter(g => set.has(g.event.id));
  }, [grouped, approved, myEventIds]);

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-12">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <Camera className="w-3.5 h-3.5" /> Memory archive
      </div>
      <h1 className="mt-2 text-3xl md:text-4xl font-display font-bold">Gallery</h1>
      <p className="mt-1 text-muted-foreground">Relive every official trip — photos and clips, curated by the crew.</p>

      {(!approved || approved.length === 0) ? (
        <div className="mt-12 rounded-3xl border border-dashed border-border p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-ice grid place-items-center text-ice-foreground"><ImageIcon className="w-7 h-7" /></div>
          <h2 className="mt-4 font-display font-bold text-2xl">Memories are waiting to be made</h2>
          <p className="mt-2 text-muted-foreground">Join a trip, ride with the group, and come back with moments worth saving.</p>
          <Link to="/trips"><Button size="lg" className="mt-5">Explore upcoming trips</Button></Link>
        </div>
      ) : (
        <>
          {/* Featured */}
          <Section icon={Sparkles} title="Featured trip memories">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {grouped.slice(0, 6).map(g => <TripCard key={g.event.id} g={g} />)}
            </div>
          </Section>

          {/* My memories */}
          {myMedia.length > 0 && (
            <Section icon={Camera} title="My memories">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {myMedia.map(g => <TripCard key={g.event.id} g={g} />)}
              </div>
            </Section>
          )}

          {/* All */}
          <Section icon={Calendar} title="All trip albums">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {grouped.map(g => <TripCard key={g.event.id} g={g} />)}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function TripCard({ g }: { g: { event: NonNullable<Media["events"]>; media: Media[]; cover?: Media } }) {
  const cover = g.cover!;
  return (
    <Link to="/trips/$id" params={{ id: g.event.id }} className="block rounded-2xl overflow-hidden bg-card border border-border hover:border-accent transition group">
      <div className="aspect-[4/3] relative bg-secondary">
        {cover.media_type === "image" ? (
          <img src={cover.media_url} alt={g.event.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition" />
        ) : (
          <>
            <video src={cover.media_url} className="w-full h-full object-cover" muted preload="metadata" />
            <div className="absolute inset-0 grid place-items-center bg-black/30"><Play className="w-10 h-10 text-white drop-shadow" /></div>
          </>
        )}
        <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-background/90 backdrop-blur font-medium">{g.media.length} {g.media.length === 1 ? "memory" : "memories"}</span>
      </div>
      <div className="p-3">
        <div className="font-display font-bold truncate">{g.event.title}</div>
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{g.event.destination}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{new Date(g.event.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</div>
      </div>
    </Link>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display font-bold text-xl inline-flex items-center gap-2"><Icon className="w-5 h-5 text-primary" />{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
