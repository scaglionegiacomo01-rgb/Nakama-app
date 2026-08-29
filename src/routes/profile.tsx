import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { RankBadge } from "@/components/RankBadge";
import { StatTile } from "@/components/SectionLabel";
import { SNOWBOARD_LEVELS, MOUNTAIN_LEVELS } from "@/lib/levels";
import { getRank, RANKS } from "@/lib/ranks";
import { useI18n } from "@/lib/i18n";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { InfoItem } from "@/components/profile/ProfileFields";
import {
  Camera,
  MapPin,
  Mountain,
  BookOpen,
  Images,
  Lock,
  Pencil,
  Phone,
  ShieldAlert,
  Car,
  Heart,
} from "lucide-react";

export const Route = createFileRoute("/profile")({ component: Profile });

type FormShape = Record<string, unknown>;

function Profile() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<FormShape>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [brandSearch, setBrandSearch] = useState("");
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const { data: regs } = useQuery({
    queryKey: ["profile-regs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("status, events(id, date, status, destination)")
        .eq("user_id", user!.id);
      return (data ?? []) as Array<{
        status: string;
        events: { id: string; date: string; status: string; destination: string } | null;
      }>;
    },
  });

  const tripStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const list = (regs ?? []).filter((r) => r.events);
    const completedTrips = list.filter(
      (r) => r.status === "confirmed" && r.events!.status === "completed",
    );
    const upcoming = list.filter(
      (r) =>
        ["pending", "confirmed", "waitlisted"].includes(r.status) &&
        r.events!.date >= today &&
        r.events!.status !== "completed" &&
        r.events!.status !== "cancelled",
    ).length;
    const locations = new Set(
      completedTrips.map((r) => r.events!.destination.split(",")[0].trim()),
    );
    return {
      completed: completedTrips.length,
      upcoming,
      locations: locations.size,
      completedEventIds: completedTrips.map((r) => r.events!.id),
    };
  }, [regs]);

  const { data: crewCount } = useQuery({
    queryKey: ["profile-crew-count", user?.id, tripStats.completedEventIds.join(",")],
    enabled: !!user && tripStats.completedEventIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("user_id")
        .in("event_id", tripStats.completedEventIds)
        .eq("status", "confirmed")
        .neq("user_id", user!.id);
      return new Set((data ?? []).map((r) => r.user_id)).size;
    },
  });

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("profile.toast_max_5mb"));
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error } = await supabase
      .from("profiles")
      .update({ profile_picture_url: url })
      .eq("user_id", user.id);
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm({ ...form, profile_picture_url: url });
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success(t("profile.toast_pic_updated"));
  };

  const save = async () => {
    setBusy(true);
    const username = ((form.username as string) || "").trim().toLowerCase() || null;
    if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
      setBusy(false);
      toast.error(t("profile.toast_username_format"));
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: (form.full_name as string) ?? null,
        username,
        phone: (form.phone as string) ?? null,
        date_of_birth: (form.date_of_birth as string) || null,
        city: (form.city as string) ?? null,
        snowboard_level:
          (form.snowboard_level as "beginner" | "intermediate" | "advanced" | "expert") || null,
        mountain_level: (form.mountain_level as "beginner" | "intermediate" | "advanced") || null,
        has_equipment: !!form.has_equipment,
        needs_rental: !!form.needs_rental,
        has_car: !!form.has_car,
        willing_to_drive: !!form.willing_to_drive,
        car_seats: Number(form.car_seats) || 0,
        emergency_contact_name: (form.emergency_contact_name as string) ?? null,
        emergency_contact_phone: (form.emergency_contact_phone as string) ?? null,
        bio: (form.bio as string) ?? null,
        favorite_brands: (form.favorite_brands as string[]) ?? [],
        accepted_liability: !!form.accepted_liability,
        accepted_rules: !!form.accepted_rules,
      })
      .eq("user_id", user!.id);
    setBusy(false);
    if (error) {
      if ((error.message || "").includes("profiles_username_key"))
        toast.error(t("profile.toast_username_taken"));
      else if ((error.message || "").includes("profiles_username_format"))
        toast.error(t("profile.toast_username_invalid"));
      else toast.error(error.message);
    } else {
      toast.success(t("profile.toast_updated"));
      qc.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  if (loading || isLoading) return <div className="max-w-3xl mx-auto px-4 py-12">{t("common.loading")}</div>;

  const f = form as Record<string, string | boolean | number | string[]>;

  // ----- Completion calc -----
  const completionFields: Array<{ key: string; label: string; filled: boolean }> = [
    { key: "full_name", label: t("profile.field_full_name"), filled: !!(f.full_name as string)?.trim() },
    { key: "username", label: t("profile.field_username"), filled: !!(f.username as string)?.trim() },
    { key: "profile_picture_url", label: t("profile.field_avatar"), filled: !!(f.profile_picture_url as string) },
    { key: "city", label: t("profile.field_city"), filled: !!(f.city as string)?.trim() },
    { key: "snowboard_level", label: t("profile.field_snowboard_level"), filled: !!(f.snowboard_level as string) },
    { key: "mountain_level", label: t("profile.field_mountain_level"), filled: !!(f.mountain_level as string) },
    { key: "bio", label: t("profile.field_bio"), filled: !!(f.bio as string)?.trim() },
    {
      key: "emergency_contact_name",
      label: t("profile.field_emergency_contact"),
      filled: !!(f.emergency_contact_name as string)?.trim(),
    },
  ];
  const completedFields = completionFields.filter((c) => c.filled).length;
  const completionPct = Math.round((completedFields / completionFields.length) * 100);
  const missing = completionFields.filter((c) => !c.filled).map((c) => c.label);

  const brands = (f.favorite_brands as string[]) ?? [];

  const sbLevelKey = SNOWBOARD_LEVELS.find((l) => l.value === f.snowboard_level)?.titleKey;
  const mtLevelKey = MOUNTAIN_LEVELS.find((l) => l.value === f.mountain_level)?.titleKey;
  const sbLevel = sbLevelKey ? t(sbLevelKey) : undefined;
  const mtLevel = mtLevelKey ? t(mtLevelKey) : undefined;
  const displayName = (f.full_name as string) || (f.username as string) || t("common.your_name");

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-10 md:pt-10">
      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 md:p-6">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 0%, oklch(0.40 0.17 5 / 0.28) 0%, transparent 55%), radial-gradient(circle at 100% 20%, oklch(0.34 0.07 320 / 0.30) 0%, transparent 55%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div className="rounded-full ring-2 ring-primary/50 ring-offset-2 ring-offset-card">
                <UserAvatar
                  url={f.profile_picture_url as string}
                  name={displayName}
                  className="h-[66px] w-[66px] text-lg"
                />
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-md hover:scale-105 transition"
                aria-label={t("profile.change_avatar")}
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar(file);
                }}
              />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="font-display text-[25px] leading-[1.05] tracking-[-0.045em] whitespace-nowrap truncate">
                {displayName}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <RankBadge completed={tripStats.completed} size="sm" />
                {f.city && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {f.city as string}
                  </span>
                )}
              </div>
              {uploading && <div className="mt-1.5 text-xs text-muted-foreground">{t("common.uploading")}</div>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditMode(true);
              setTimeout(
                () =>
                  document
                    .getElementById("edit-profile")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                50,
              );
            }}
            className="w-10 h-10 rounded-full bg-secondary grid place-items-center shrink-0"
            aria-label={t("profile.edit")}
          >
            <Pencil className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2.5">
          <StatTile value={tripStats.completed} label={t("profile.completed_trips")} />
          <StatTile value={tripStats.locations} label={t("profile.locations")} />
          <StatTile value={crewCount ?? "—"} label={t("profile.nakama_met")} />
        </div>
      </section>

      {/* ====== NEXT RANK ====== */}
      <NextRankCard completed={tripStats.completed} />

      {/* ====== COMPLETION ====== */}
      {completionPct < 100 && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{t("profile.completion_title")}</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {missing.length > 0
                  ? `${t("profile.missing")}: ${missing.slice(0, 3).join(", ")}${
                      missing.length > 3 ? "…" : ""
                    }`
                  : t("profile.all_set")}
              </div>
            </div>
            <div className="text-2xl font-display font-bold text-primary shrink-0">
              {completionPct}%
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <Button
            size="sm"
            className="mt-4 w-full sm:w-auto"
            onClick={() => {
              setEditMode(true);
              setTimeout(
                () =>
                  document
                    .getElementById("edit-profile")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                50,
              );
            }}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            {t("profile.completion_cta")}
          </Button>
        </section>
      )}

      {/* ====== RIDING IDENTITY ====== */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 md:p-5">
        <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
          <Mountain className="w-4 h-4 text-primary" />
          {t("profile.riding_identity")}
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoItem label={t("profile.snowboard")} value={sbLevel ?? "—"} />
          <InfoItem label={t("profile.mountain")} value={mtLevel ?? "—"} />
          <InfoItem
            label={t("profile.own_gear")}
            value={f.has_equipment ? t("common.yes") : f.needs_rental ? t("profile.needs_rental") : "—"}
          />
          <InfoItem label={t("profile.brands")} value={brands.length > 0 ? `${brands.length}` : "—"} />
        </div>
        {brands.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {brands.slice(0, 8).map((b) => (
              <span
                key={b}
                className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-foreground"
              >
                {b}
              </span>
            ))}
            {brands.length > 8 && (
              <span className="text-[11px] text-muted-foreground">+{brands.length - 8}</span>
            )}
          </div>
        )}
      </section>

      {/* ====== TRIP IDENTITY ====== */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 md:p-5">
        <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary" />
          {t("profile.trip_identity")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/passport"
            className="rounded-xl border border-border bg-background p-3 flex items-center gap-2 hover:border-primary/40 transition"
          >
            <span className="w-9 h-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="text-sm font-medium">{t("profile.open_passport")}</span>
          </Link>
          <Link
            to="/gallery"
            className="rounded-xl border border-border bg-background p-3 flex items-center gap-2 hover:border-primary/40 transition"
          >
            <span className="w-9 h-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
              <Images className="w-4 h-4" />
            </span>
            <span className="text-sm font-medium">{t("profile.open_gallery")}</span>
          </Link>
        </div>
      </section>

      {/* ====== PRIVATE INFO (collapsible) ====== */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 md:p-5">
        <h2 className="font-display font-bold text-base mb-1 flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          {t("profile.private_info")}
        </h2>
        <p className="text-xs text-muted-foreground">{t("profile.private_note")}</p>
        <Accordion type="multiple" className="mt-2">
          <AccordionItem value="contact" className="border-border">
            <AccordionTrigger className="py-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <Phone className="w-4 h-4" /> {t("profile.contact")}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem label={t("profile.phone")} value={(f.phone as string) || "—"} />
                <InfoItem label={t("profile.dob")} value={(f.date_of_birth as string) || "—"} />
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="emergency" className="border-border">
            <AccordionTrigger className="py-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> {t("profile.field_emergency_contact")}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem label={t("profile.name")} value={(f.emergency_contact_name as string) || "—"} />
                <InfoItem label={t("profile.phone")} value={(f.emergency_contact_phone as string) || "—"} />
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="transport" className="border-border border-b-0">
            <AccordionTrigger className="py-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <Car className="w-4 h-4" /> {t("profile.section_transport")}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem label={t("profile.has_car")} value={f.has_car ? t("common.yes") : t("common.no")} />
                <InfoItem label={t("profile.willing_to_drive")} value={f.willing_to_drive ? t("common.yes") : t("common.no")} />
                <InfoItem label={t("profile.seats")} value={String(Number(f.car_seats) || 0)} />
                <InfoItem label={t("profile.needs_rental")} value={f.needs_rental ? t("common.yes") : t("common.no")} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* ====== EDIT TOGGLE ====== */}
      <div id="edit-profile" className="mt-6">
        <Button
          variant={editMode ? "outline" : "default"}
          className="w-full sm:w-auto"
          onClick={() => setEditMode((v) => !v)}
        >
          <Pencil className="w-4 h-4 mr-2" />
          {editMode ? t("profile.close_edit") : t("profile.edit")}
        </Button>
      </div>

      {/* ====== EDIT FORM (accordions) ====== */}
      {editMode && (
        <ProfileEditForm
          form={form}
          setForm={setForm}
          busy={busy}
          save={save}
          brandSearch={brandSearch}
          setBrandSearch={setBrandSearch}
        />
      )}
    </div>
  );
}

function NextRankCard({ completed }: { completed: number }) {
  const { t } = useI18n();
  const rank = getRank(completed);
  const idx = RANKS.findIndex((r) => r.title === rank.title);
  const next = RANKS[idx + 1];

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4 md:p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        {next ? t("profile.next_rank") : t("profile.next_rank_maxed")}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="text-3xl shrink-0">{next ? next.emoji : rank.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg leading-tight truncate">
            {next ? next.title : rank.title}
          </div>
          {next && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {t(
                next.min - completed === 1 ? "profile.trips_to_go_one" : "profile.trips_to_go_other",
                { n: next.min - completed },
              )}
            </div>
          )}
        </div>
      </div>
      {next && (
        <div className="mt-3 relative h-[5px] rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[oklch(0.40_0.17_5)] to-[oklch(0.62_0.24_350)]"
            style={{
              width: `${Math.min(100, Math.round(((completed - rank.min) / (next.min - rank.min)) * 100))}%`,
            }}
          />
        </div>
      )}
      <p className="mt-3 text-sm italic text-muted-foreground">"{t(rank.descriptionKey)}"</p>
    </section>
  );
}
