import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { RankBadge } from "@/components/RankBadge";
import { BRAND_GROUPS } from "@/lib/brands";
import { SNOWBOARD_LEVELS, MOUNTAIN_LEVELS, HONESTY_DISCLAIMER, SEATS_DISCLAIMER } from "@/lib/levels";
import { getRank } from "@/lib/ranks";
import { useI18n } from "@/lib/i18n";
import {
  Camera,
  Search,
  X,
  MapPin,
  Mountain,
  BookOpen,
  Images,
  Lock,
  CheckCircle2,
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
        .select("status, events(id, date, status)")
        .eq("user_id", user!.id);
      return (data ?? []) as Array<{
        status: string;
        events: { id: string; date: string; status: string } | null;
      }>;
    },
  });

  const tripStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const list = (regs ?? []).filter((r) => r.events);
    const completed = list.filter(
      (r) => r.status === "confirmed" && r.events!.status === "completed"
    ).length;
    const upcoming = list.filter(
      (r) =>
        ["pending", "confirmed", "waitlisted"].includes(r.status) &&
        r.events!.date >= today &&
        r.events!.status !== "completed" &&
        r.events!.status !== "cancelled"
    ).length;
    return { completed, upcoming };
  }, [regs]);

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
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
    toast.success("Profile picture updated");
  };

  const save = async () => {
    setBusy(true);
    const username = ((form.username as string) || "").trim().toLowerCase() || null;
    if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
      setBusy(false);
      toast.error("Username must be 3–20 chars, lowercase letters, numbers or underscore");
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
        mountain_level:
          (form.mountain_level as "beginner" | "intermediate" | "advanced") || null,
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
        toast.error("That username is taken");
      else if ((error.message || "").includes("profiles_username_format"))
        toast.error("Invalid username format");
      else toast.error(error.message);
    } else {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  if (loading || isLoading)
    return <div className="max-w-3xl mx-auto px-4 py-12">Loading...</div>;

  const f = form as Record<string, string | boolean | number | string[]>;

  // ----- Completion calc -----
  const completionFields: Array<{ key: string; label: string; filled: boolean }> = [
    { key: "full_name", label: "Full name", filled: !!(f.full_name as string)?.trim() },
    { key: "username", label: "Username", filled: !!(f.username as string)?.trim() },
    { key: "profile_picture_url", label: "Avatar", filled: !!(f.profile_picture_url as string) },
    { key: "city", label: "City", filled: !!(f.city as string)?.trim() },
    { key: "snowboard_level", label: "Snowboard level", filled: !!(f.snowboard_level as string) },
    { key: "mountain_level", label: "Mountain level", filled: !!(f.mountain_level as string) },
    { key: "bio", label: "Bio", filled: !!(f.bio as string)?.trim() },
    { key: "emergency_contact_name", label: "Emergency contact", filled: !!(f.emergency_contact_name as string)?.trim() },
  ];
  const completedFields = completionFields.filter((c) => c.filled).length;
  const completionPct = Math.round((completedFields / completionFields.length) * 100);
  const missing = completionFields.filter((c) => !c.filled).map((c) => c.label);

  const brands = (f.favorite_brands as string[]) ?? [];
  const toggleBrand = (b: string) => {
    const set = new Set(brands);
    if (set.has(b)) set.delete(b);
    else set.add(b);
    setForm({ ...form, favorite_brands: Array.from(set) });
  };

  const sbLevel = SNOWBOARD_LEVELS.find((l) => l.value === f.snowboard_level)?.title;
  const mtLevel = MOUNTAIN_LEVELS.find((l) => l.value === f.mountain_level)?.title;
  const displayName = (f.full_name as string) || (f.username as string) || "Your name";

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-10 md:pt-10">
      {/* ====== HERO CARD ====== */}
      <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-secondary/40 p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <UserAvatar
              url={f.profile_picture_url as string}
              name={displayName}
              size="xl"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-md hover:scale-105 transition"
              aria-label="Change avatar"
            >
              <Camera className="w-4 h-4" />
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
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("profile.your_card")}
            </div>
            <div className="mt-0.5 font-display font-bold text-xl md:text-2xl truncate">
              {displayName}
            </div>
            {f.username && (
              <div className="text-sm text-muted-foreground truncate">
                @{f.username as string}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RankBadge completed={tripStats.completed} size="sm" />
              {f.city && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {f.city as string}
                </span>
              )}
            </div>
            {uploading && (
              <div className="mt-2 text-xs text-muted-foreground">Uploading…</div>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat
            label={t("profile.completed_trips")}
            value={String(tripStats.completed)}
          />
          <Stat
            label={t("profile.upcoming_trips")}
            value={String(tripStats.upcoming)}
          />
          <Stat label="Level" value={sbLevel ?? "—"} />
        </div>
      </section>

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
                  : "All set."}
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
                50
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
          <InfoItem label="Snowboard" value={sbLevel ?? "—"} />
          <InfoItem label="Mountain" value={mtLevel ?? "—"} />
          <InfoItem
            label="Own gear"
            value={f.has_equipment ? "Yes" : f.needs_rental ? "Needs rental" : "—"}
          />
          <InfoItem
            label="Brands"
            value={brands.length > 0 ? `${brands.length}` : "—"}
          />
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
                <Phone className="w-4 h-4" /> Contact
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem label="Phone" value={(f.phone as string) || "—"} />
                <InfoItem
                  label="DOB"
                  value={(f.date_of_birth as string) || "—"}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="emergency" className="border-border">
            <AccordionTrigger className="py-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Emergency contact
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem
                  label="Name"
                  value={(f.emergency_contact_name as string) || "—"}
                />
                <InfoItem
                  label="Phone"
                  value={(f.emergency_contact_phone as string) || "—"}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="transport" className="border-border border-b-0">
            <AccordionTrigger className="py-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <Car className="w-4 h-4" /> Transport
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem label="Has car" value={f.has_car ? "Yes" : "No"} />
                <InfoItem
                  label="Willing to drive"
                  value={f.willing_to_drive ? "Yes" : "No"}
                />
                <InfoItem label="Seats" value={String(Number(f.car_seats) || 0)} />
                <InfoItem
                  label="Needs rental"
                  value={f.needs_rental ? "Yes" : "No"}
                />
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
          {editMode ? "Close edit" : t("profile.edit")}
        </Button>
      </div>

      {/* ====== EDIT FORM (accordions) ====== */}
      {editMode && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-1 md:p-2">
          <Accordion type="multiple" defaultValue={["basic"]} className="px-2 md:px-3">
            <AccordionItem value="basic" className="border-border">
              <AccordionTrigger className="text-sm font-semibold">
                {t("profile.section_basic")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid sm:grid-cols-2 gap-4 pb-3">
                  <Field label="Full name">
                    <Input
                      value={(f.full_name as string) ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, full_name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Username">
                    <Input
                      value={(f.username as string) ?? ""}
                      placeholder="powderhunter"
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value.toLowerCase() })
                      }
                    />
                  </Field>
                  <Field label="Date of birth">
                    <Input
                      type="date"
                      value={(f.date_of_birth as string) ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, date_of_birth: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="City / departure area">
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
                    <Label className="mb-1.5 block">Snowboard level</Label>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {SNOWBOARD_LEVELS.map((l) => {
                        const on = f.snowboard_level === l.value;
                        return (
                          <button
                            type="button"
                            key={l.value}
                            onClick={() =>
                              setForm({ ...form, snowboard_level: l.value })
                            }
                            className={`text-left rounded-xl border p-3 transition ${
                              on
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border bg-background hover:border-primary/40"
                            }`}
                          >
                            <div className="font-semibold text-sm">{l.title}</div>
                            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {l.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Mountain experience</Label>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {MOUNTAIN_LEVELS.map((l) => {
                        const on = f.mountain_level === l.value;
                        return (
                          <button
                            type="button"
                            key={l.value}
                            onClick={() =>
                              setForm({ ...form, mountain_level: l.value })
                            }
                            className={`text-left rounded-xl border p-3 transition ${
                              on
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border bg-background hover:border-primary/40"
                            }`}
                          >
                            <div className="font-semibold text-sm">{l.title}</div>
                            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {l.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    {HONESTY_DISCLAIMER}
                  </p>
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
                    label="I have my own snowboard equipment"
                    checked={!!f.has_equipment}
                    onChange={(v) => setForm({ ...form, has_equipment: v })}
                  />
                  <Toggle
                    label="I need rental"
                    checked={!!f.needs_rental}
                    onChange={(v) => setForm({ ...form, needs_rental: v })}
                  />
                  <div>
                    <Label className="mb-1.5 block">Favorite brands</Label>
                    <div className="flex flex-wrap gap-1.5 mb-3 min-h-[2rem]">
                      {brands.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">
                          No brands selected yet
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
                          Browse brands
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <div className="p-2 border-b border-border">
                          <Input
                            value={brandSearch}
                            onChange={(e) => setBrandSearch(e.target.value)}
                            placeholder="Search brand…"
                            className="h-8"
                          />
                        </div>
                        <div className="max-h-72 overflow-y-auto p-2 space-y-3">
                          {BRAND_GROUPS.map((g) => {
                            const filtered = g.brands.filter((b) =>
                              b.toLowerCase().includes(brandSearch.toLowerCase())
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
                    label="I have a car"
                    checked={!!f.has_car}
                    onChange={(v) => setForm({ ...form, has_car: v })}
                  />
                  <Toggle
                    label="I'm willing to drive"
                    checked={!!f.willing_to_drive}
                    onChange={(v) => setForm({ ...form, willing_to_drive: v })}
                  />
                  {f.has_car && (
                    <Field label="Available seats (excl. driver)">
                      <Input
                        type="number"
                        min={0}
                        value={Number(f.car_seats) || 0}
                        onChange={(e) =>
                          setForm({ ...form, car_seats: +e.target.value })
                        }
                      />
                    </Field>
                  )}
                  <p className="text-xs text-muted-foreground italic">
                    {SEATS_DISCLAIMER}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="safety" className="border-border">
              <AccordionTrigger className="text-sm font-semibold">
                {t("profile.section_safety")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid sm:grid-cols-2 gap-4 pb-3">
                  <Field label="Phone">
                    <Input
                      value={(f.phone as string) ?? ""}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </Field>
                  <Field label="Emergency contact name">
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
                  <Field label="Emergency contact phone">
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
                  <Field label="Short bio (public)">
                    <Textarea
                      value={(f.bio as string) ?? ""}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="Tell the crew a bit about you"
                    />
                  </Field>
                  <Toggle
                    label="I accept the liability disclaimer"
                    checked={!!f.accepted_liability}
                    onChange={(v) => setForm({ ...form, accepted_liability: v })}
                  />
                  <Toggle
                    label="I accept the community rules"
                    checked={!!f.accepted_rules}
                    onChange={(v) => setForm({ ...form, accepted_rules: v })}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="p-3">
            <Button
              onClick={save}
              disabled={busy}
              size="lg"
              className="w-full sm:w-auto"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {busy ? t("profile.saving") : t("profile.save")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/60 border border-border p-2.5 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-display font-bold text-sm truncate">{value}</div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-medium text-sm truncate">{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(!!v)}
        className="mt-0.5"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
