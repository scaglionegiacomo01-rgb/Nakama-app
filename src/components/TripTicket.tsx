import { Link } from "@tanstack/react-router";
import { Car } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { eventTypeLabel } from "@/lib/event-tags";
import { photoFor } from "@/lib/photo-for";
import { useI18n } from "@/lib/i18n";

type TicketEvent = {
  id: string;
  title: string;
  destination: string;
  date: string;
  type: string;
  meeting_point?: string | null;
  departure_time?: string | null;
  cover_image_url?: string | null;
};

/**
 * The next trip isn't a card like the others — it's a ticket, the one
 * object the "Oggi" dashboard exists to show. Torn-edge divider between a
 * photo header and a boarding-pass body of departure / meeting point / seats.
 */
export function TripTicket({
  event,
  statusLabel,
  spotsLeft,
  crew = [],
  crewExtra = 0,
  orientation = "vertical",
  priceEstimate,
}: {
  event: TicketEvent;
  statusLabel: string;
  spotsLeft?: number;
  crew?: { url: string | null; name: string | null }[];
  crewExtra?: number;
  orientation?: "vertical" | "horizontal";
  priceEstimate?: number | null;
}) {
  const { t, lang } = useI18n();
  const { src, look } = photoFor(event.destination, event.cover_image_url);

  const days = Math.ceil(
    (new Date(event.date + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) /
      86400000,
  );
  const countdown =
    days <= 0
      ? lang === "it"
        ? "OGGI"
        : "TODAY"
      : lang === "it"
        ? `TRA ${days} GIORN${days === 1 ? "O" : "I"}`
        : `IN ${days} DAY${days === 1 ? "" : "S"}`;

  if (orientation === "horizontal") {
    const crewTotal = crew.length + crewExtra;
    return (
      <div className="rounded-[26px] bg-card overflow-hidden border border-[oklch(0.34_0.032_290/0.6)] shadow-[0_20px_50px_-24px_oklch(0.40_0.17_5/0.6)] flex">
        <div className="relative w-[290px] shrink-0">
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
                "linear-gradient(90deg, oklch(0.40 0.17 5 / .3), oklch(0.20 0.022 288 / .55))",
            }}
          />
          <span className="nakama-glass absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.16em] text-white border border-white/16 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-nakama-coral nk-pulse" />
            {countdown}
          </span>
        </div>
        <div className="flex-1 min-w-0 p-[22px_24px]">
          <div className="flex items-start justify-between gap-3.5">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">
                {eventTypeLabel(event.type, t).toUpperCase()} · {event.destination}
              </div>
              <div className="mt-[7px] font-display text-[32px] leading-[1.02] tracking-[-0.045em] whitespace-nowrap truncate">
                {event.title}
              </div>
            </div>
            <span className="shrink-0 px-2.5 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-[0.14em] whitespace-nowrap">
              {statusLabel}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3.5">
            <TicketField label={t("home.departure")} value={event.departure_time ?? "—"} />
            <TicketField label={t("home.meeting_point")} value={event.meeting_point ?? "—"} />
            <TicketField
              label={t("home.seats")}
              value={spotsLeft != null ? String(spotsLeft) : "—"}
              tone="coral"
            />
            <TicketField
              label={t("home.estimate")}
              value={priceEstimate != null ? `~${priceEstimate}€` : "—"}
            />
          </div>
          <div className="mt-[22px] flex flex-wrap items-center gap-x-3.5 gap-y-3">
            {crew.length > 0 && (
              <div
                className="flex items-center shrink-0"
                title={t("home.crew_here", { n: crewTotal })}
              >
                {crew.slice(0, 4).map((c, i) => (
                  <UserAvatar
                    key={i}
                    url={c.url}
                    name={c.name}
                    size="sm"
                    className="ring-2 ring-card"
                    style={{ marginLeft: i === 0 ? 0 : -10 }}
                  />
                ))}
                {crewExtra > 0 && (
                  <span
                    className="w-[30px] h-[30px] rounded-full ring-2 ring-card bg-secondary grid place-items-center text-[9.5px] font-bold"
                    style={{ marginLeft: -10 }}
                  >
                    +{crewExtra}
                  </span>
                )}
              </div>
            )}
            <div className="flex-1 min-w-[20px]" />
            <Link
              to="/trips/$id"
              params={{ id: event.id }}
              search={{ tab: "carpool" }}
              className="h-11 px-3.5 rounded-[14px] border border-border bg-secondary inline-flex items-center gap-2 text-[13.5px] font-semibold shrink-0"
            >
              <Car className="w-[17px] h-[17px]" strokeWidth={1.75} />
              Carpool
            </Link>
            <Link to="/trips/$id" params={{ id: event.id }} className="shrink-0">
              <span className="nk-sheen relative overflow-hidden flex items-center justify-center h-11 px-[22px] rounded-[14px] bg-gradient-to-br from-[oklch(0.45_0.19_5)] to-[oklch(0.36_0.15_355)] text-white font-semibold text-[14px] whitespace-nowrap shadow-[0_10px_26px_-12px_oklch(0.40_0.17_5/0.9)]">
                {t("home.open_trip")}
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[26px] bg-card overflow-hidden shadow-[0_20px_50px_-22px_oklch(0.40_0.17_5/0.55)]">
      <div className="relative h-[138px]">
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: look.pos, transform: `scale(${look.scale})` }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(180deg, oklch(0.40 0.17 5 / 0.35) 0%, transparent 40%, var(--card) 100%)`,
          }}
        />
        <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between gap-2">
          <span className="nakama-glass inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9.5px] font-bold uppercase tracking-[0.14em] text-white border border-white/12 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-nakama-coral nk-pulse" />
            {countdown}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[9.5px] font-bold uppercase tracking-[0.14em] whitespace-nowrap">
            {statusLabel}
          </span>
        </div>
        <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="text-nakama-coral text-[9px] font-bold uppercase tracking-[0.14em] whitespace-nowrap">
              {eventTypeLabel(event.type, t).toUpperCase()} · {event.destination}
            </div>
            <div className="mt-0.5 font-display text-2xl leading-[1.04] tracking-[-0.04em] text-white whitespace-nowrap">
              {event.title}
            </div>
          </div>
          {crew.length > 0 && (
            <div className="flex items-center shrink-0">
              {crew.slice(0, 4).map((c, i) => (
                <UserAvatar
                  key={i}
                  url={c.url}
                  name={c.name}
                  size="xs"
                  className="ring-card"
                  style={{ marginLeft: i === 0 ? 0 : -9 }}
                />
              ))}
              {crewExtra > 0 && (
                <span
                  className="w-6 h-6 rounded-full ring-2 ring-card bg-secondary grid place-items-center text-[9px] font-bold"
                  style={{ marginLeft: -9 }}
                >
                  +{crewExtra}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className="h-px mx-[18px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, oklch(0.34 0.032 290) 0 6px, transparent 6px 12px)",
        }}
      />

      <div className="px-[18px] pt-[13px] pb-[15px]">
        <div className="grid grid-cols-3 gap-2">
          <TicketField label={t("home.departure")} value={event.departure_time ?? "—"} />
          <TicketField label={t("home.meeting_point")} value={event.meeting_point ?? "—"} />
          <TicketField
            label={t("home.seats")}
            value={spotsLeft != null ? String(spotsLeft) : "—"}
            tone="coral"
          />
        </div>
        <div className="mt-3.5 flex gap-2">
          <Link to="/trips/$id" params={{ id: event.id }} className="flex-1">
            <span className="nk-sheen flex items-center justify-center h-[46px] rounded-2xl bg-gradient-to-br from-[oklch(0.45_0.19_5)] to-[oklch(0.36_0.15_355)] text-white font-semibold text-[14.5px] shadow-[0_10px_26px_-12px_oklch(0.40_0.17_5/0.9)]">
              {t("home.open_trip")}
            </span>
          </Link>
          <Link
            to="/trips/$id"
            params={{ id: event.id }}
            search={{ tab: "carpool" }}
            className="w-[46px] h-[46px] rounded-2xl bg-secondary grid place-items-center shrink-0"
            aria-label="Carpool"
          >
            <Car className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function TicketField({ label, value, tone }: { label: string; value: string; tone?: "coral" }) {
  return (
    <div className="min-w-0">
      <div className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap">
        {label}
      </div>
      <div
        className={
          "mt-0.5 font-display text-[17px] leading-[1.1] tracking-[-0.03em] truncate " +
          (tone === "coral" ? "text-nakama-coral" : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}
