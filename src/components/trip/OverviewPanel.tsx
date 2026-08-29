import { AlertTriangle, ShieldCheck, Calendar, MapPin, Clock, Users, Mountain } from "lucide-react";
import { EventTag } from "@/components/EventTag";
import { useI18n } from "@/lib/i18n";

type Event = {
  description: string | null; required_equipment: string | null; lunch_plan: string | null;
  rental_available: boolean | null; safety_notes: string | null; tags: string[] | null;
  date: string; meeting_point: string; departure_time: string | null; return_time: string | null;
  max_participants: number; price_estimate: number | null;
};

export function OverviewPanel({ event, spotsLeft }: { event: Event; spotsLeft: number }) {
  const { t, lang } = useI18n();
  return (
    <div>
      {event.tags && event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">{event.tags.map(tag => <EventTag key={tag} tag={tag} />)}</div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Info icon={Calendar} label={t("tripov.date")} value={new Date(event.date).toLocaleDateString(lang === "it" ? "it-IT" : "en-US",{weekday:"long",day:"numeric",month:"long"})} />
        <Info icon={MapPin} label={t("tripov.meeting_point")} value={event.meeting_point} />
        <Info icon={Clock} label={t("tripov.departure")} value={event.departure_time ?? t("tripov.tba")} />
        <Info icon={Clock} label={t("tripov.return_est")} value={event.return_time ?? t("tripov.tba")} />
        <Info icon={Users} label={t("tripov.spots")} value={t("tripov.spots_left", { left: spotsLeft, max: event.max_participants })} />
        <Info icon={Mountain} label={t("tripov.price_estimate")} value={event.price_estimate ? `~${event.price_estimate}€` : t("tripov.free")} />
      </div>

      <div className="mt-6 rounded-2xl bg-summit/10 border border-summit/30 p-5">
        <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="w-4 h-4" /> {t("tripov.safety_banner_title")}</div>
        <p className="mt-2 text-sm">{t("tripov.safety_banner_body")}</p>
      </div>

      {event.description && <Section title={t("tripov.about")}>{event.description}</Section>}
      {event.required_equipment && <Section title={t("tripov.required_equipment")}>{event.required_equipment}</Section>}
      {event.lunch_plan && <Section title={t("tripov.lunch")}>{event.lunch_plan}</Section>}
      {event.rental_available && <Section title={t("tripov.rental")}>{t("tripov.rental_available")}</Section>}
      {event.safety_notes && (
        <div className="mt-6 rounded-2xl bg-destructive/10 border border-destructive/30 p-5">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="w-4 h-4" /> {t("tripov.safety_notes")}</div>
          <p className="mt-2 text-sm whitespace-pre-line">{event.safety_notes}</p>
        </div>
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ComponentType<{className?:string}>; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="w-3.5 h-3.5" />{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-6"><h2 className="font-display font-bold text-lg">{title}</h2><p className="mt-2 text-muted-foreground whitespace-pre-line">{children}</p></div>;
}
