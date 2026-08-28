import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mountain, ArrowLeft, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import heroImg from "@/assets/hero-mountain.jpg";

export const Route = createFileRoute("/cloud-nine")({
  head: () => ({
    meta: [
      { title: "Cloud Nine — Nakama" },
      {
        name: "description",
        content: "The 9 rules that keep the Nakama crew safe, fair and together.",
      },
    ],
  }),
  component: CloudNinePage,
});

const RULES: { it: string; en: string; body_it: string; body_en: string }[] = [
  {
    it: "Nobody gets left behind.",
    en: "Nobody gets left behind.",
    body_it:
      "Si sale insieme, si scende insieme, si torna a casa insieme. Non è un modo di dire: è come organizziamo ogni giornata. Se qualcuno è rimasto indietro, si aspetta. Se qualcuno ha bisogno, ci si ferma.",
    body_en:
      "We go up together, we ride down together, we come home together. This is not just a saying: it is how we organize every day. If someone falls behind, we wait. If someone needs help, we stop.",
  },
  {
    it: "Rispetta tutti.",
    en: "Respect everyone.",
    body_it:
      "Ogni persona nel gruppo merita rispetto, a prescindere dal livello, dall'età o da quanto conosce la montagna. Qui non esistono domande stupide e non esistono persone fuori posto.",
    body_en:
      "Every person in the group deserves respect, regardless of level, age or mountain experience. Here there are no stupid questions and no one is out of place.",
  },
  {
    it: "Sii onesto sul tuo livello.",
    en: "Be honest about your level.",
    body_it:
      "Quando ti iscrivi a un'uscita, di' come stai davvero con la tavola. Non per essere giudicato, ma perché il gruppo si organizza meglio e la giornata è più bella per tutti.",
    body_en:
      "When you join a trip, be honest about where you really are with your board. Not to be judged, but because the group can organize better and the day becomes better for everyone.",
  },
  {
    it: "Se sei alle prime armi, prendi un maestro.",
    en: "If you are just starting, take a lesson.",
    body_it:
      "Nel gruppo ci sono persone disposte ad aiutarti, ma non sono istruttori. Le prime volte sulla tavola richiedono una guida professionale per imparare bene, per stare al sicuro e per non scoraggiarsi.",
    body_en:
      "There are people in the group willing to help, but they are not instructors. Your first times on a snowboard require professional guidance to learn properly, stay safe and avoid getting discouraged.",
  },
  {
    it: "Non mettere pressione a chi è meno esperto.",
    en: "Do not pressure less experienced riders.",
    body_it:
      "Se qualcuno è più lento, si aspetta. Se qualcuno non se la sente su una pista, si trova un'alternativa. Nessuno deve sentirsi in imbarazzo per il proprio livello.",
    body_en:
      "If someone is slower, we wait. If someone does not feel ready for a slope, we find an alternative. Nobody should feel embarrassed about their level.",
  },
  {
    it: "Aiuta quando puoi.",
    en: "Help when you can.",
    body_it:
      "Se sei più esperto e qualcuno ha bisogno, offriti. Non serve fare il maestro, basta essere disponibile. Un consiglio, una mano per alzarsi, aspettare qualcuno in fondo alla pista.",
    body_en:
      "If you are more experienced and someone needs help, offer it. You do not need to be an instructor. A simple tip, a hand getting up, or waiting at the bottom of the slope can matter.",
  },
  {
    it: "Rispetta gli orari.",
    en: "Respect meeting times.",
    body_it:
      "Il punto di ritrovo, la partenza, il rientro sono condivisi. Rispettarli è rispettare il tempo di tutti gli altri.",
    body_en:
      "The meeting point, departure and return time are shared. Respecting them means respecting everyone else's time.",
  },
  {
    it: "Segui le indicazioni di sicurezza.",
    en: "Follow safety instructions.",
    body_it:
      "Le regole sulla montagna esistono per una ragione. Casco, comportamento sulle piste, segnali non si discutono.",
    body_en:
      "Mountain rules exist for a reason. Helmet, behavior on slopes and safety signs are not optional.",
  },
  {
    it: "Sei responsabile di te stesso.",
    en: "You are responsible for yourself.",
    body_it:
      "La montagna ha rischi reali. Ognuno conosce i propri limiti e ne risponde in prima persona. Se qualcosa non ti convince, dillo: nessuno ti obbliga a fare niente.",
    body_en:
      "The mountain has real risks. Everyone knows their own limits and is personally responsible for their decisions. If something does not feel right, say it: nobody forces you to do anything.",
  },
];

function CloudNinePage() {
  const { lang } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const intro =
    lang === "it"
      ? "Semplici, condivise, non negoziabili. Tengono la crew unita e al sicuro."
      : "Simple, shared, non-negotiable. They keep the crew together and safe.";
  const moreRulesLabel = lang === "it" ? "Altre 6 regole" : "6 more rules";

  const visibleRules = expanded ? RULES : RULES.slice(0, 3);

  return (
    <div className="pb-12">
      <section className="relative h-[268px] overflow-hidden">
        <img
          src={heroImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "50% 60%" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.13 0.012 250 / .5) 0%, oklch(0.40 0.17 5 / .2) 45%, oklch(0.16 0.014 250) 100%)",
          }}
        />
        <div className="relative px-5 pt-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Back"
            className="nakama-glass w-[38px] h-[38px] rounded-full grid place-items-center border border-white/16 text-white"
          >
            <ArrowLeft className="w-[19px] h-[19px]" />
          </button>
        </div>
        <div className="absolute left-5 right-5 bottom-[22px]">
          <div className="inline-flex items-center gap-[7px] px-3 py-[6px] rounded-full bg-primary text-[10px] font-bold uppercase tracking-[0.18em] whitespace-nowrap">
            <Mountain className="w-[13px] h-[13px]" /> Cloud Nine
          </div>
          <h1 className="mt-3.5 font-display text-[44px] leading-[1.0] tracking-[-0.05em]">
            {lang === "it" ? (
              <>
                Le 9 regole
                <br />
                della crew
              </>
            ) : (
              <>
                The crew's
                <br />9 rules
              </>
            )}
          </h1>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-5 pt-[18px] md:max-w-2xl">
        <p className="text-[13.5px] leading-[1.55] text-muted-foreground">{intro}</p>
        <div className="mt-[18px] flex flex-col gap-[11px]">
          {visibleRules.map((r, i) => (
            <div
              key={i}
              className={cn(
                "rounded-[20px] border p-4",
                i === 0
                  ? "border-[oklch(0.62_0.24_350/0.35)] bg-[linear-gradient(135deg,oklch(0.40_0.17_5/0.2),oklch(0.20_0.022_288))]"
                  : "border-[oklch(0.34_0.032_290/0.55)] bg-card",
              )}
            >
              <div className="flex items-baseline gap-[11px]">
                <span
                  className={cn(
                    "font-display text-[26px] leading-none tracking-[-0.05em]",
                    i === 0 ? "text-nakama-pink" : "text-primary",
                  )}
                >
                  {i + 1}.
                </span>
                <h3 className="font-display text-[17px] leading-[1.15] tracking-[-0.03em] font-bold">
                  {lang === "it" ? r.it : r.en}
                </h3>
              </div>
              <p
                className={cn(
                  "mt-[9px] text-[12.5px] leading-[1.55]",
                  i === 0 ? "text-foreground/80" : "text-muted-foreground",
                )}
              >
                {lang === "it" ? r.body_it : r.body_en}
              </p>
            </div>
          ))}

          {!expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex items-center justify-between px-1 text-[11.5px] text-muted-foreground"
            >
              <span>{moreRulesLabel}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
