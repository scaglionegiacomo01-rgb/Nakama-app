import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { typeLabel } from "@/components/EventCard";
import { photoFor } from "@/lib/photo-for";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Event = Database["public"]["Tables"]["events"]["Row"];

const HOT_TAGS = new Set(["Powder Day", "Park Session", "Progression Day"]);

/**
 * The trip card: a full-bleed photo with a brand-tinted gradient and the
 * essentials (category, spots left, date, title, price) laid over it —
 * replaces the flat bg-card EventCard as the primary way trips are browsed.
 */
export function PhotoCard({
  event,
  spotsLeft,
  height = 238,
  className,
}: {
  event: Event;
  spotsLeft?: number;
  height?: number;
  className?: string;
}) {
  const { lang } = useI18n();
  const { src, look } = photoFor(event.destination, event.cover_image_url);
  const tags = (event as unknown as { tags?: string[] }).tags ?? [];
  const hotTag = tags.find((t) => HOT_TAGS.has(t));
  const dateLabel = new Date(event.date)
    .toLocaleDateString(lang === "it" ? "it-IT" : "en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .toUpperCase();
  // Below ~150px there's no room for the top pill row + the full meta
  // block without them colliding — drop down to just eyebrow + title.
  const compact = height < 150;

  return (
    <Link
      to="/trips/$id"
      params={{ id: event.id }}
      className={cn(
        "group relative block overflow-hidden rounded-[26px] border border-[oklch(0.34_0.032_290/0.5)] transition-transform duration-300 hover:-translate-y-0.5",
        className,
      )}
      style={{ height }}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        style={{ objectPosition: look.pos, transform: `scale(${look.scale})` }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(180deg, ${look.tint} 0%, transparent 35%, oklch(0.13 0.012 250 / 0.94) 100%)`,
        }}
      />

      {!compact && (
        <div className="absolute inset-x-[14px] top-[14px] flex items-center justify-between gap-2">
          <span
            className={cn(
              "px-2.5 py-1 rounded-full text-[9.5px] font-bold uppercase tracking-[0.14em] whitespace-nowrap",
              hotTag
                ? "bg-nakama-pink text-white"
                : "bg-black/30 text-white border border-white/25",
            )}
          >
            {hotTag ?? typeLabel[event.type] ?? event.type}
          </span>
          {spotsLeft != null && (
            <span className="nakama-glass px-2.5 py-1 rounded-full text-[9.5px] font-bold uppercase tracking-[0.14em] whitespace-nowrap text-white border border-white/12">
              {spotsLeft} {lang === "it" ? "posti" : "spots"}
            </span>
          )}
        </div>
      )}

      {compact ? (
        <div className="absolute inset-x-3 bottom-2.5">
          <div className="text-nakama-coral text-[8px] font-bold uppercase tracking-[0.12em] whitespace-nowrap">
            {dateLabel} · {event.destination}
          </div>
          <div className="mt-0.5 font-display text-[15px] leading-[1.1] tracking-[-0.03em] text-white truncate">
            {event.title}
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-[18px] bottom-[16px]">
          <div className="text-nakama-coral text-[9px] font-bold uppercase tracking-[0.14em] whitespace-nowrap">
            {dateLabel} · {event.destination}
          </div>
          <div className="mt-1 font-display text-[26px] leading-[1.0] tracking-[-0.04em] text-white line-clamp-1">
            {event.title}
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div className="text-[12px] text-white/80 flex items-center gap-2 flex-wrap min-w-0">
              {event.departure_time && <span>{event.departure_time}</span>}
              {event.price_estimate != null && (
                <span className="font-display text-[15px] text-white">
                  ~{event.price_estimate}€
                </span>
              )}
            </div>
            <span className="w-9 h-9 rounded-full bg-primary grid place-items-center shrink-0">
              <ArrowUpRight className="w-4 h-4 text-primary-foreground" />
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}
