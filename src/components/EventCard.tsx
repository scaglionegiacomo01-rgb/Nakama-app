import { Link, useNavigate } from "@tanstack/react-router";
import { Calendar, MapPin, Users, Mountain } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { EventTag } from "@/components/EventTag";
import { getCardTags } from "@/lib/event-tags";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Event = Database["public"]["Tables"]["events"]["Row"];

const typeLabel: Record<string, string> = {
  snowboard: "Snowboard", mountain_walk: "Mountain walk", skate: "Skate", surf: "Surf",
};

const HIDDEN_MOBILE_TAGS = new Set<string>([
  "Packed Lunch",
  "Carpool",
  "Rental Available",
  "Social Ride",
  "First Time Friendly",
]);

export function EventCard({ event, spotsLeft, myRegStatus }: { event: Event; spotsLeft?: number; myRegStatus?: string }) {
  const { lang } = useI18n();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const rawTags = (event as unknown as { tags?: string[] }).tags ?? [];
  const displayTags = isMobile ? rawTags.filter((t) => !HIDDEN_MOBILE_TAGS.has(t)) : rawTags;
  const { visible, overflow } = getCardTags(displayTags, 3);
  const moreLabel = lang === "it" ? `+${overflow} altri` : `+${overflow} more`;

  const ACTIVE_STATUSES = ["pending", "confirmed", "waitlisted"];
  const isJoined = !!myRegStatus && ACTIVE_STATUSES.includes(myRegStatus);

  const ctaLabel = isJoined
    ? (lang === "it" ? "Iscritto" : "Joined")
    : (lang === "it" ? "Unisciti" : "Join Trip");

  const handleCta = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate({ to: "/trips/$id", params: { id: event.id } });
  };

  return (
    <Link
      to="/trips/$id"
      params={{ id: event.id }}
      className="group relative block overflow-hidden rounded-3xl border border-border/70 surface-elevated p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_24px_60px_-20px_oklch(0.40_0.17_5/0.45)]"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center gap-2.5 text-xs flex-wrap">
        <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary-foreground/90 font-semibold tracking-wide uppercase text-[10px] border border-primary/30">
          {typeLabel[event.type] ?? event.type}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground font-medium capitalize">
          {event.difficulty}
        </span>
        {visible.map(t => <EventTag key={t} tag={t} />)}
        {overflow > 0 && (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {moreLabel}
          </span>
        )}
      </div>
      <h3 className="mt-4 font-display font-bold text-xl leading-tight group-hover:text-accent transition-colors">
        {event.title}
      </h3>
      <div className="mt-1 text-sm text-muted-foreground inline-flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5" />{event.destination}
      </div>
      <div className="mt-4 space-y-1.5 text-sm">
        <div className="inline-flex items-center gap-2 text-foreground/90">
          <Calendar className="w-3.5 h-3.5 text-accent" />
          {new Date(event.date).toLocaleDateString(lang === "it" ? "it-IT" : "en-US", { weekday: "short", day: "numeric", month: "short" })}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mountain className="w-3.5 h-3.5" />Meet: {event.meeting_point} · {event.departure_time ?? "—"}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-3.5 h-3.5" />Max {event.max_participants}{spotsLeft != null && ` · ${spotsLeft} spots left`}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="text-base font-display font-bold tracking-tight">
          {event.price_estimate ? `~${event.price_estimate}€` : "Free"}
        </span>
        <span className="hidden md:inline text-xs text-accent font-semibold uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">
          View details →
        </span>
        <button
          onClick={handleCta}
          className={cn(
            "md:hidden text-xs font-semibold uppercase tracking-wider transition-transform",
            isJoined ? "text-primary" : "text-accent group-hover:translate-x-0.5"
          )}
        >
          {isJoined ? `${ctaLabel} ✓` : `${ctaLabel} →`}
        </button>
      </div>
    </Link>
  );
}
