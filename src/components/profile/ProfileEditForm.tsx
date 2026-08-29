import type { Dispatch, SetStateAction } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SNOWBOARD_LEVELS, MOUNTAIN_LEVELS } from "@/lib/levels";
import { BRAND_GROUPS } from "@/lib/brands";
import { Field, Toggle } from "./ProfileFields";

export type ProfileForm = Record<string, unknown>;

/**
 * The editable half of the profile page. Kept apart from the read-only card so
 * neither half has to be read to understand the other.
 */
export function ProfileEditForm({
  form,
  setForm,
  busy,
  save,
  brandSearch,
  setBrandSearch,
}: {
  form: ProfileForm;
  setForm: Dispatch<SetStateAction<ProfileForm>>;
  busy: boolean;
  save: () => void;
  brandSearch: string;
  setBrandSearch: Dispatch<SetStateAction<string>>;
}) {
  const { t } = useI18n();
  const f = form as Record<string, string | boolean | number | string[]>;
  const brands = (f.favorite_brands as string[]) ?? [];
  const toggleBrand = (b: string) => {
    const set = new Set(brands);
    if (set.has(b)) set.delete(b);
    else set.add(b);
    setForm({ ...form, favorite_brands: Array.from(set) });
  };

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-1 md:p-2">
      <Accordion type="multiple" defaultValue={["basic"]} className="px-2 md:px-3">
        <AccordionItem value="basic" className="border-border">
          <AccordionTrigger className="text-sm font-semibold">
            {t("profile.section_basic")}
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid sm:grid-cols-2 gap-4 pb-3">
              <Field label={t("profedit.full_name")}>
                <Input
                  value={(f.full_name as string) ?? ""}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </Field>
              <Field label={t("profedit.username")}>
                <Input
                  value={(f.username as string) ?? ""}
                  placeholder={t("profedit.username_placeholder")}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                />
              </Field>
              <Field label={t("profedit.dob")}>
                <Input
                  type="date"
                  value={(f.date_of_birth as string) ?? ""}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                />
              </Field>
              <Field label={t("profedit.city")}>
                <Input
                  value={(f.city as string) ?? ""}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="riding" className="border-border">
          <AccordionTrigger className="text-sm font-semibold">
            {t("profile.section_riding")}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-3">
              <div>
                <Label className="mb-1.5 block">{t("profedit.snowboard_level")}</Label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {SNOWBOARD_LEVELS.map((l) => {
                    const on = f.snowboard_level === l.value;
                    return (
                      <button
                        type="button"
                        key={l.value}
                        onClick={() => setForm({ ...form, snowboard_level: l.value })}
                        className={`text-left rounded-xl border p-3 transition ${
                          on
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border bg-background hover:border-primary/40"
                        }`}
                      >
                        <div className="font-semibold text-sm">{t(l.titleKey)}</div>
                        <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {t(l.descriptionKey)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">{t("profedit.mountain_experience")}</Label>
                <div className="grid sm:grid-cols-3 gap-2">
                  {MOUNTAIN_LEVELS.map((l) => {
                    const on = f.mountain_level === l.value;
                    return (
                      <button
                        type="button"
                        key={l.value}
                        onClick={() => setForm({ ...form, mountain_level: l.value })}
                        className={`text-left rounded-xl border p-3 transition ${
                          on
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border bg-background hover:border-primary/40"
                        }`}
                      >
                        <div className="font-semibold text-sm">{t(l.titleKey)}</div>
                        <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {t(l.descriptionKey)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">{t("level.honesty_disclaimer")}</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="equipment" className="border-border">
          <AccordionTrigger className="text-sm font-semibold">
            {t("profile.section_equipment")}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-3">
              <Toggle
                label={t("profedit.has_equipment")}
                checked={!!f.has_equipment}
                onChange={(v) => setForm({ ...form, has_equipment: v })}
              />
              <Toggle
                label={t("profedit.needs_rental")}
                checked={!!f.needs_rental}
                onChange={(v) => setForm({ ...form, needs_rental: v })}
              />
              <div>
                <Label className="mb-1.5 block">{t("profedit.favorite_brands")}</Label>
                <div className="flex flex-wrap gap-1.5 mb-3 min-h-[2rem]">
                  {brands.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">
                      {t("profedit.no_brands")}
                    </span>
                  ) : (
                    brands.map((b) => (
                      <button
                        type="button"
                        key={b}
                        onClick={() => toggleBrand(b)}
                        className="text-xs px-2.5 py-1 rounded-full bg-primary text-primary-foreground inline-flex items-center gap-1 hover:opacity-80"
                      >
                        {b}
                        <X className="w-3 h-3" />
                      </button>
                    ))
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Search className="w-3.5 h-3.5 mr-1" />
                      {t("profedit.browse_brands")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-2 border-b border-border">
                      <Input
                        value={brandSearch}
                        onChange={(e) => setBrandSearch(e.target.value)}
                        placeholder={t("profedit.search_brand")}
                        className="h-8"
                      />
                    </div>
                    <div className="max-h-72 overflow-y-auto p-2 space-y-3">
                      {BRAND_GROUPS.map((g) => {
                        const filtered = g.brands.filter((b) =>
                          b.toLowerCase().includes(brandSearch.toLowerCase()),
                        );
                        if (filtered.length === 0) return null;
                        return (
                          <div key={g.category}>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 px-1">
                              {g.category}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {filtered.map((b) => {
                                const on = brands.includes(b);
                                return (
                                  <button
                                    key={b}
                                    type="button"
                                    onClick={() => toggleBrand(b)}
                                    className={`text-xs px-2 py-1 rounded-full border transition ${
                                      on
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-secondary border-transparent hover:border-border"
                                    }`}
                                  >
                                    {b}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="transport" className="border-border">
          <AccordionTrigger className="text-sm font-semibold">
            {t("profile.section_transport")}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-3">
              <Toggle
                label={t("profedit.has_car")}
                checked={!!f.has_car}
                onChange={(v) => setForm({ ...form, has_car: v })}
              />
              <Toggle
                label={t("profedit.willing_to_drive")}
                checked={!!f.willing_to_drive}
                onChange={(v) => setForm({ ...form, willing_to_drive: v })}
              />
              {f.has_car && (
                <Field label={t("profedit.seats_excl_driver")}>
                  <Input
                    type="number"
                    min={0}
                    value={Number(f.car_seats) || 0}
                    onChange={(e) => setForm({ ...form, car_seats: +e.target.value })}
                  />
                </Field>
              )}
              <p className="text-xs text-muted-foreground italic">{t("level.seats_disclaimer")}</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="safety" className="border-border">
          <AccordionTrigger className="text-sm font-semibold">
            {t("profile.section_safety")}
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid sm:grid-cols-2 gap-4 pb-3">
              <Field label={t("profedit.phone")}>
                <Input
                  value={(f.phone as string) ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label={t("profedit.emergency_name")}>
                <Input
                  value={(f.emergency_contact_name as string) ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      emergency_contact_name: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label={t("profedit.emergency_phone")}>
                <Input
                  value={(f.emergency_contact_phone as string) ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      emergency_contact_phone: e.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="preferences" className="border-border border-b-0">
          <AccordionTrigger className="text-sm font-semibold">
            {t("profile.section_preferences")}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-3">
              <Field label={t("profedit.bio_label")}>
                <Textarea
                  value={(f.bio as string) ?? ""}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder={t("profedit.bio_placeholder")}
                />
              </Field>
              <Toggle
                label={t("profedit.accept_liability")}
                checked={!!f.accepted_liability}
                onChange={(v) => setForm({ ...form, accepted_liability: v })}
              />
              <Toggle
                label={t("profedit.accept_rules")}
                checked={!!f.accepted_rules}
                onChange={(v) => setForm({ ...form, accepted_rules: v })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="p-3">
        <Button onClick={save} disabled={busy} size="lg" className="w-full sm:w-auto">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {busy ? t("profile.saving") : t("profile.save")}
        </Button>
      </div>
    </section>
  );
}
