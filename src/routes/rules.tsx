import { createFileRoute } from "@tanstack/react-router";
import { Shield, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/rules")({
  head: () => ({ meta: [{ title: "Community rules — Nakama" }] }),
  component: Rules,
});

const RULE_KEYS = [
  "rules.item_1",
  "rules.item_2",
  "rules.item_3",
  "rules.item_4",
  "rules.item_5",
  "rules.item_6",
  "rules.item_7",
  "rules.item_8",
  "rules.item_9",
];

function Rules() {
  const { t } = useI18n();
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-summit" />
        <h1 className="text-3xl md:text-4xl font-bold">{t("rules.title")}</h1>
      </div>
      <p className="mt-3 text-muted-foreground">{t("rules.subtitle")}</p>
      <ul className="mt-8 space-y-3">
        {RULE_KEYS.map((key) => (
          <li key={key} className="flex items-start gap-3 rounded-xl bg-card border border-border p-4">
            <Check className="w-5 h-5 text-summit shrink-0 mt-0.5" />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 rounded-2xl bg-destructive/10 border border-destructive/30 p-5 text-sm">
        <strong className="block mb-1">{t("rules.disclaimer_title")}</strong>
        {t("rules.disclaimer_body")}
      </div>
    </div>
  );
}
