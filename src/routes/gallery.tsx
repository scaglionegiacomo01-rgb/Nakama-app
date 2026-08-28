import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Camera, ImageIcon, Play } from "lucide-react";
import { SectionLabel } from "@/components/SectionLabel";

export const Route = createFileRoute("/gallery")({ component: Gallery });

type Media = {
  id: string;
  event_id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  status: string;
  is_trip_cover: boolean;
  is_featured: boolean;
  created_at: string;
  events?: { id: string; title: string; destination: string; date: string; status: string } | null;
};

function Gallery() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", search: { mode: "login" } });
    }
  }, [user, loading, navigate]);

  const { data: approved } = useQuery({
    queryKey: ["gallery-approved"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_media")
        .select("*, events(id, title, destination, date, status)")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(200);
      return ((data ?? []) as unknown as Media[]).filter((m) => m.events);
    },
  });

  const { data: myEventIds } = useQuery({
    queryKey: ["gallery-my-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", user!.id)
        .eq("status", "confirmed");
      return (data ?? []).map((r) => r.event_id);
    },
  });

  const grouped = useMemo(() => {
    if (!approved) return [];
    const map = new Map<
      string,
      { event: NonNullable<Media["events"]>; media: Media[]; cover?: Media }
    >();
    for (const m of approved) {
      const e = m.events!;
      const g = map.get(e.id) ?? { event: e, media: [] };
      g.media.push(m);
      if (m.is_trip_cover && !g.cover) g.cover = m;
      map.set(e.id, g);
    }
    return Array.from(map.values())
      .map((g) => ({
        ...g,
        cover: g.cover ?? g.media.find((m) => m.media_type === "image") ?? g.media[0],
      }))
      .sort((a, b) => b.event.date.localeCompare(a.event.date));
  }, [approved]);

  const myMedia = useMemo(() => {
    if (!approved || !myEventIds) return [];
    const set = new Set(myEventIds);
    return grouped.filter((g) => set.has(g.event.id));
  }, [grouped, approved, myEventIds]);

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-12">Loading...</div>;

  const featured = grouped[0];
  const heroThumbs = featured ? featured.media.slice(0, 3) : [];
  const heroExtra = featured ? featured.media.length - heroThumbs.length : 0;

  return (
    <div className="max-w-3xl mx-auto px-5 pt-6 pb-10 md:pt-10 md:max-w-6xl">
      <div className="inline-flex items-center gap-[7px] text-[10px] font-bold uppercase tracking-[0.22em] text-nakama-coral whitespace-nowrap">
        <Camera className="w-[13px] h-[13px]" /> Memory archive
      </div>
      <h1 className="mt-2 font-display text-[38px] leading-[1.04] tracking-[-0.045em]">Gallery</h1>
      <p className="mt-1.5 text-[13.5px] text-muted-foreground">
        Every official trip, photos and clips curated by the crew.
      </p>

      {!approved || approved.length === 0 ? (
        <div className="mt-8 rounded-[26px] border border-dashed border-border p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-ice grid place-items-center text-ice-foreground">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h2 className="mt-4 font-display font-bold text-2xl">Memories are waiting to be made</h2>
          <p className="mt-2 text-muted-foreground">
            Join a trip, ride with the group, and come back with moments worth saving.
          </p>
          <Link to="/trips">
            <Button size="lg" className="mt-5">
              Explore upcoming trips
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Featured */}
          {featured && (
            <section className="mt-[18px]">
              <div className="relative h-[236px] rounded-[26px] overflow-hidden">
                {featured.cover!.media_type === "image" ? (
                  <img
                    src={featured.cover!.media_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={featured.cover!.media_url}
                    className="absolute inset-0 w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, oklch(0.40 0.17 5 / .22) 0%, transparent 40%, oklch(0.13 0.012 250 / .95) 100%)",
                  }}
                />
                <span className="absolute top-[14px] left-[14px] px-2.5 py-[5px] rounded-full bg-nakama-pink text-[9.5px] font-bold uppercase tracking-[0.14em] whitespace-nowrap">
                  Featured
                </span>
                <span className="absolute top-[14px] right-[14px] px-2.5 py-[5px] rounded-full bg-[rgba(11,15,18,.6)] backdrop-blur-md border border-white/15 text-[9.5px] font-bold whitespace-nowrap">
                  {featured.media.length} {featured.media.length === 1 ? "memory" : "memories"}
                </span>
                <div className="absolute left-[18px] right-[18px] bottom-4">
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-nakama-coral whitespace-nowrap">
                    {new Date(featured.event.date).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {featured.event.destination.split(",")[0].trim()}
                  </div>
                  <Link
                    to="/trips/$id"
                    params={{ id: featured.event.id }}
                    className="mt-1.5 block font-display text-[25px] leading-[1.02] tracking-[-0.04em] whitespace-nowrap truncate hover:opacity-90"
                  >
                    {featured.event.title}
                  </Link>
                  <div className="mt-[11px] flex gap-[7px]">
                    {heroThumbs.map((m) => (
                      <span
                        key={m.id}
                        className="relative w-11 h-11 rounded-xl overflow-hidden border border-white/20 shrink-0"
                      >
                        {m.media_type === "image" ? (
                          <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <video
                              src={m.media_url}
                              className="w-full h-full object-cover"
                              muted
                              preload="metadata"
                            />
                            <span className="absolute inset-0 bg-[rgba(11,15,18,.55)] grid place-items-center">
                              <Play className="w-4 h-4" />
                            </span>
                          </>
                        )}
                      </span>
                    ))}
                    {heroExtra > 0 && (
                      <span className="w-11 h-11 shrink-0 rounded-xl bg-[rgba(11,15,18,.55)] backdrop-blur-md border border-white/20 grid place-items-center text-[11px] font-bold">
                        +{heroExtra}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* All albums */}
          <section className="mt-5">
            <SectionLabel>All albums</SectionLabel>
            <div className="mt-2.5 grid grid-cols-2 gap-3">
              {grouped.map((g) => (
                <AlbumCard key={g.event.id} g={g} />
              ))}
            </div>
          </section>

          {/* My memories */}
          {myMedia.length > 0 && (
            <section className="mt-5">
              <SectionLabel>My memories</SectionLabel>
              <div className="mt-2.5 grid grid-cols-2 gap-3">
                {myMedia.map((g) => (
                  <AlbumCard key={g.event.id} g={g} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function AlbumCard({
  g,
}: {
  g: { event: NonNullable<Media["events"]>; media: Media[]; cover?: Media };
}) {
  const cover = g.cover!;
  return (
    <Link
      to="/trips/$id"
      params={{ id: g.event.id }}
      className="block rounded-[20px] overflow-hidden border border-[oklch(0.34_0.032_290/0.55)] bg-card hover:border-primary/40 transition group"
    >
      <div className="relative h-[104px] bg-secondary">
        {cover.media_type === "image" ? (
          <img
            src={cover.media_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition"
          />
        ) : (
          <>
            <video
              src={cover.media_url}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              preload="metadata"
            />
            <div className="absolute inset-0 grid place-items-center bg-black/30">
              <Play className="w-7 h-7 text-white drop-shadow" />
            </div>
          </>
        )}
        <span className="absolute top-2 right-2 px-2 py-[3px] rounded-full bg-[rgba(11,15,18,.7)] text-[9px] font-bold whitespace-nowrap">
          {g.media.length}
        </span>
      </div>
      <div className="px-3 pt-[11px] pb-[13px]">
        <div className="font-display text-[15px] leading-[1.15] tracking-[-0.03em] truncate">
          {g.event.title}
        </div>
        <div className="mt-1 text-[10.5px] text-muted-foreground truncate">
          {g.event.destination.split(",")[0].trim()} ·{" "}
          {new Date(g.event.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
        </div>
      </div>
    </Link>
  );
}
