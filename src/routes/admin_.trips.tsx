import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { LocationSearchField, type PlaceResult } from "@/components/admin/LocationSearchField";
import { LocationPickerMap } from "@/components/admin/LocationPickerMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { EVENT_TAGS } from "@/lib/event-tags";
import { EventTag } from "@/components/EventTag";
import { photoFor } from "@/lib/photo-for";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin_/trips")({ component: AdminTripsPage });

function AdminTripsPage() {
  const { ready, loading, userId } = useAdminGuard();
  const { t } = useI18n();
  if (loading || !ready || !userId)
    return <div className="max-w-6xl mx-auto px-4 py-12">{t("common.loading")}</div>;
  return (
    <AdminShell title={t("admin.nav_trips")} description={t("admin.trips_desc")}>
      <TripsSection userId={userId} />
    </AdminShell>
  );
}

// ---------- Trips (CRUD) ----------
export type EventInput = {
  title: string;
  destination: string;
  date: string;
  meeting_point: string;
  departure_time: string;
  return_time: string;
  type: Database["public"]["Enums"]["event_type"];
  difficulty: Database["public"]["Enums"]["event_difficulty"];
  max_participants: number;
  price_estimate: number;
  lunch_plan: string;
  rental_available: boolean;
  required_equipment: string;
  description: string;
  safety_notes: string;
  status: Database["public"]["Enums"]["event_status"];
  organizer_name: string;
  tags: string[];
  location_name: string;
  resort_name: string;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
};
const blankEvent: EventInput = {
  title: "",
  destination: "",
  date: "",
  meeting_point: "",
  departure_time: "08:00",
  return_time: "19:00",
  type: "snowboard",
  difficulty: "easy",
  max_participants: 10,
  price_estimate: 0,
  lunch_plan: "Packed lunch",
  rental_available: false,
  required_equipment: "",
  description: "",
  safety_notes: "",
  status: "draft",
  organizer_name: "",
  tags: [],
  location_name: "",
  resort_name: "",
  latitude: null,
  longitude: null,
  cover_image_url: null,
};

function TripsSection({ userId }: { userId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id?: string; form: EventInput } | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);

  const uploadCover = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t("admin.toast_max_8mb"));
      return;
    }
    setUploadingCover(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `covers/${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("trip-media")
      .upload(path, file, { contentType: file.type });
    setUploadingCover(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: pub } = supabase.storage.from("trip-media").getPublicUrl(path);
    setEditing((cur) => cur && { ...cur, form: { ...cur.form, cover_image_url: pub.publicUrl } });
  };

  const handlePlaceSelected = (place: PlaceResult) => {
    setEditing(
      (cur) =>
        cur && {
          ...cur,
          form: {
            ...cur.form,
            destination: place.label,
            location_name: place.label,
            latitude: place.lat,
            longitude: place.lng,
          },
        },
    );
  };

  const { data: events } = useQuery({
    queryKey: ["admin-events-all"],
    queryFn: async () =>
      (await supabase.from("events").select("*").order("date", { ascending: false })).data ?? [],
  });

  const save = async () => {
    if (!editing) return;
    const { id, form } = editing;
    const payload = { ...form, organizer_id: userId };
    const { error } = id
      ? await supabase.from("events").update(payload).eq("id", id)
      : await supabase.from("events").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success(id ? t("admin.toast_trip_updated") : t("admin.toast_trip_created"));
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-events-all"] });
    }
  };
  const setStatus = async (id: string, status: EventInput["status"]) => {
    const { error } = await supabase.from("events").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("admin.toast_status_updated"));
      qc.invalidateQueries({ queryKey: ["admin-events-all"] });
    }
  };
  const remove = async (id: string) => {
    if (!confirm(t("admin.confirm_delete_trip"))) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("admin.toast_deleted"));
      qc.invalidateQueries({ queryKey: ["admin-events-all"] });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold">{t("admin.all_trips", { n: events?.length ?? 0 })}</h2>
        <Button onClick={() => setEditing({ form: blankEvent })}>
          <Plus className="w-4 h-4 mr-1" />
          {t("admin.new_trip")}
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {events?.map((e) => (
          <div key={e.id} className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-bold">{e.title}</div>
                <div className="text-sm text-muted-foreground">
                  {e.destination} · {new Date(e.date).toLocaleDateString()}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-xs capitalize">
                    {e.status}
                  </span>
                  {((e.tags as string[] | null) ?? []).slice(0, 4).map((t) => (
                    <EventTag key={t} tag={t} />
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={e.status}
                  onValueChange={(v: EventInput["status"]) => setStatus(e.id, v)}
                >
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["draft", "published", "cancelled", "completed"] as const).map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Link to="/admin/events/$id" params={{ id: e.id }}>
                  <Button size="sm" variant="outline">
                    <Users className="w-4 h-4 mr-1" />
                    {t("admin.details")}
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setEditing({
                      id: e.id,
                      form: {
                        ...blankEvent,
                        ...e,
                        tags: (e.tags as string[] | null) ?? [],
                      } as EventInput,
                    })
                  }
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(e.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {events && events.length === 0 && (
          <p className="text-muted-foreground">{t("admin.no_trips_yet")}</p>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("admin.edit_trip") : t("admin.new_trip")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <F label={t("admin.field_title")}>
                <Input
                  value={editing.form.title}
                  onChange={(e) =>
                    setEditing({ ...editing, form: { ...editing.form, title: e.target.value } })
                  }
                />
              </F>
              <div>
                <Label className="mb-1.5 block text-xs">{t("admin.field_cover_photo")}</Label>
                <div className="flex items-center gap-3">
                  <div className="relative w-24 h-16 shrink-0 rounded-lg overflow-hidden bg-secondary border border-border">
                    <img
                      src={editing.form.cover_image_url || photoFor(editing.form.destination).src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {!editing.form.cover_image_url && (
                      <span className="absolute inset-0 grid place-items-center bg-black/40 text-[9px] font-semibold text-white text-center px-1">
                        {t("admin.default_photo")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploadingCover}
                      onClick={() => coverFileRef.current?.click()}
                    >
                      <Camera className="w-3.5 h-3.5 mr-1.5" />
                      {uploadingCover
                        ? t("common.uploading")
                        : editing.form.cover_image_url
                          ? t("admin.change_photo")
                          : t("admin.upload_photo")}
                    </Button>
                    {editing.form.cover_image_url && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            form: { ...editing.form, cover_image_url: null },
                          })
                        }
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        {t("admin.remove_use_default")}
                      </Button>
                    )}
                  </div>
                  <input
                    ref={coverFileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCover(file);
                      e.target.value = "";
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{t("admin.cover_photo_hint")}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label={t("admin.field_date")}>
                  <Input
                    type="date"
                    value={editing.form.date}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, date: e.target.value } })
                    }
                  />
                </F>
                <F label={t("admin.field_meeting_point")}>
                  <Input
                    value={editing.form.meeting_point}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: { ...editing.form, meeting_point: e.target.value },
                      })
                    }
                  />
                </F>
                <F label={t("admin.field_organizer_name")}>
                  <Input
                    value={editing.form.organizer_name}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: { ...editing.form, organizer_name: e.target.value },
                      })
                    }
                  />
                </F>
                <F label={t("admin.field_departure_time")}>
                  <Input
                    value={editing.form.departure_time}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: { ...editing.form, departure_time: e.target.value },
                      })
                    }
                  />
                </F>
                <F label={t("admin.field_return_time")}>
                  <Input
                    value={editing.form.return_time}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: { ...editing.form, return_time: e.target.value },
                      })
                    }
                  />
                </F>
                <F label={t("admin.field_max_participants")}>
                  <Input
                    type="number"
                    value={editing.form.max_participants}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: { ...editing.form, max_participants: +e.target.value },
                      })
                    }
                  />
                </F>
                <F label={t("admin.field_price_estimate")}>
                  <Input
                    type="number"
                    value={editing.form.price_estimate}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: { ...editing.form, price_estimate: +e.target.value },
                      })
                    }
                  />
                </F>
                <F label={t("admin.field_type")}>
                  <Select
                    value={editing.form.type}
                    onValueChange={(v: EventInput["type"]) =>
                      setEditing({ ...editing, form: { ...editing.form, type: v } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["snowboard", "mountain_walk", "skate", "surf"] as const).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </F>
                <F label={t("admin.field_difficulty")}>
                  <Select
                    value={editing.form.difficulty}
                    onValueChange={(v: EventInput["difficulty"]) =>
                      setEditing({ ...editing, form: { ...editing.form, difficulty: v } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["easy", "moderate", "hard", "expert"] as const).map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </F>
                <F label={t("admin.field_status")}>
                  <Select
                    value={editing.form.status}
                    onValueChange={(v: EventInput["status"]) =>
                      setEditing({ ...editing, form: { ...editing.form, status: v } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["draft", "published", "cancelled", "completed"] as const).map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </F>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">{t("admin.field_location")}</Label>
                <LocationSearchField
                  value={editing.form.destination}
                  onChange={(text) =>
                    setEditing({ ...editing, form: { ...editing.form, destination: text } })
                  }
                  onSelect={handlePlaceSelected}
                />
                <div className="mt-2">
                  <LocationPickerMap
                    value={
                      editing.form.latitude !== null && editing.form.longitude !== null
                        ? { lat: editing.form.latitude, lng: editing.form.longitude }
                        : null
                    }
                    onChange={(v) =>
                      setEditing(
                        (cur) =>
                          cur && {
                            ...cur,
                            form: { ...cur.form, latitude: v.lat, longitude: v.lng },
                          },
                      )
                    }
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{t("admin.location_hint")}</p>
              </div>
              <F label={t("admin.field_lunch_plan")}>
                <Input
                  value={editing.form.lunch_plan}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      form: { ...editing.form, lunch_plan: e.target.value },
                    })
                  }
                />
              </F>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={editing.form.rental_available}
                  onCheckedChange={(v) =>
                    setEditing({ ...editing, form: { ...editing.form, rental_available: !!v } })
                  }
                />
                {t("admin.rental_on_site")}
              </label>
              <F label={t("admin.field_required_equipment")}>
                <Textarea
                  value={editing.form.required_equipment}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      form: { ...editing.form, required_equipment: e.target.value },
                    })
                  }
                />
              </F>
              <F label={t("admin.field_description")}>
                <Textarea
                  rows={4}
                  value={editing.form.description}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      form: { ...editing.form, description: e.target.value },
                    })
                  }
                />
              </F>
              <F label={t("admin.field_safety_notes")}>
                <Textarea
                  value={editing.form.safety_notes}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      form: { ...editing.form, safety_notes: e.target.value },
                    })
                  }
                />
              </F>
              <div>
                <Label className="mb-1.5 block text-xs">{t("admin.field_tags")}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_TAGS.map((tg) => {
                    const on = editing.form.tags.includes(tg);
                    return (
                      <button
                        type="button"
                        key={tg}
                        onClick={() =>
                          setEditing({
                            ...editing,
                            form: {
                              ...editing.form,
                              tags: on
                                ? editing.form.tags.filter((x) => x !== tg)
                                : [...editing.form.tags, tg],
                            },
                          })
                        }
                        className={`transition ${on ? "ring-2 ring-primary rounded-full" : "opacity-60 hover:opacity-100"}`}
                      >
                        <EventTag tag={tg} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button onClick={save} className="w-full">
                {t("admin.save_trip")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {children}
    </div>
  );
}
