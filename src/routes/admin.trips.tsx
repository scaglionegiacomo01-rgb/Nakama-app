import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { EVENT_TAGS } from "@/lib/event-tags";
import { EventTag } from "@/components/EventTag";

export const Route = createFileRoute("/admin/trips")({ component: AdminTripsPage });

function AdminTripsPage() {
  const { ready, loading, userId } = useAdminGuard();
  if (loading || !ready || !userId) return <div className="max-w-6xl mx-auto px-4 py-12">Loading...</div>;
  return (
    <AdminShell title="Trips" description="Create and manage every trip on the calendar.">
      <TripsSection userId={userId} />
    </AdminShell>
  );
}

// ---------- Trips (CRUD) ----------
export type EventInput = {
  title: string; destination: string; date: string; meeting_point: string;
  departure_time: string; return_time: string; type: Database["public"]["Enums"]["event_type"]; difficulty: Database["public"]["Enums"]["event_difficulty"];
  max_participants: number; price_estimate: number; lunch_plan: string;
  rental_available: boolean; required_equipment: string; description: string;
  safety_notes: string; status: Database["public"]["Enums"]["event_status"]; organizer_name: string; tags: string[];
  location_name: string; resort_name: string; latitude: number | null; longitude: number | null;
};
const blankEvent: EventInput = {
  title: "", destination: "", date: "", meeting_point: "",
  departure_time: "08:00", return_time: "19:00", type: "snowboard", difficulty: "easy",
  max_participants: 10, price_estimate: 0, lunch_plan: "Packed lunch",
  rental_available: false, required_equipment: "", description: "",
  safety_notes: "", status: "draft", organizer_name: "", tags: [],
  location_name: "", resort_name: "", latitude: null, longitude: null,
};

// Free OpenStreetMap geocoder — no API key. Used by admins to fill in trip
// coordinates from the destination name so the Passport map can plot pins.
async function geocodeDestination(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const results = (await res.json()) as { lat: string; lon: string }[];
  if (results.length === 0) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

function TripsSection({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id?: string; form: EventInput } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const lookupCoordinates = async () => {
    if (!editing?.form.destination) { toast.error("Enter a destination first"); return; }
    setGeocoding(true);
    try {
      const coords = await geocodeDestination(editing.form.destination);
      if (!coords) { toast.error("No coordinates found for that destination"); return; }
      setEditing(cur => cur && { ...cur, form: { ...cur.form, latitude: coords.lat, longitude: coords.lng } });
      toast.success("Coordinates found");
    } catch {
      toast.error("Lookup failed, try again");
    } finally {
      setGeocoding(false);
    }
  };

  const { data: events } = useQuery({
    queryKey: ["admin-events-all"],
    queryFn: async () => (await supabase.from("events").select("*").order("date", { ascending: false })).data ?? [],
  });

  const save = async () => {
    if (!editing) return;
    const { id, form } = editing;
    const payload = { ...form, organizer_id: userId };
    const { error } = id
      ? await supabase.from("events").update(payload).eq("id", id)
      : await supabase.from("events").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(id ? "Trip updated" : "Trip created"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-events-all"] }); }
  };
  const setStatus = async (id: string, status: EventInput["status"]) => {
    const { error } = await supabase.from("events").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin-events-all"] }); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this trip? This cannot be undone.")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-events-all"] }); }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold">All trips ({events?.length ?? 0})</h2>
        <Button onClick={() => setEditing({ form: blankEvent })}><Plus className="w-4 h-4 mr-1" />New trip</Button>
      </div>

      <div className="mt-4 space-y-3">
        {events?.map(e => (
          <div key={e.id} className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-bold">{e.title}</div>
                <div className="text-sm text-muted-foreground">{e.destination} · {new Date(e.date).toLocaleDateString()}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-xs capitalize">{e.status}</span>
                  {(e.tags as string[] | null ?? []).slice(0, 4).map(t => <EventTag key={t} tag={t} />)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={e.status} onValueChange={(v: EventInput["status"]) => setStatus(e.id, v)}>
                  <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{(["draft", "published", "cancelled", "completed"] as const).map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
                <Link to="/admin/events/$id" params={{ id: e.id }}><Button size="sm" variant="outline"><Users className="w-4 h-4 mr-1" />Details</Button></Link>
                <Button size="sm" variant="ghost" onClick={() => setEditing({ id: e.id, form: { ...blankEvent, ...e, tags: (e.tags as string[] | null) ?? [] } as EventInput })}><Pencil className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        ))}
        {events && events.length === 0 && <p className="text-muted-foreground">No trips yet. Create the first one.</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit trip" : "New trip"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <F label="Title"><Input value={editing.form.title} onChange={e => setEditing({ ...editing, form: { ...editing.form, title: e.target.value } })} /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Destination"><Input value={editing.form.destination} onChange={e => setEditing({ ...editing, form: { ...editing.form, destination: e.target.value } })} /></F>
                <F label="Date"><Input type="date" value={editing.form.date} onChange={e => setEditing({ ...editing, form: { ...editing.form, date: e.target.value } })} /></F>
                <F label="Meeting point"><Input value={editing.form.meeting_point} onChange={e => setEditing({ ...editing, form: { ...editing.form, meeting_point: e.target.value } })} /></F>
                <F label="Organizer name"><Input value={editing.form.organizer_name} onChange={e => setEditing({ ...editing, form: { ...editing.form, organizer_name: e.target.value } })} /></F>
                <F label="Departure time"><Input value={editing.form.departure_time} onChange={e => setEditing({ ...editing, form: { ...editing.form, departure_time: e.target.value } })} /></F>
                <F label="Return time"><Input value={editing.form.return_time} onChange={e => setEditing({ ...editing, form: { ...editing.form, return_time: e.target.value } })} /></F>
                <F label="Max participants"><Input type="number" value={editing.form.max_participants} onChange={e => setEditing({ ...editing, form: { ...editing.form, max_participants: +e.target.value } })} /></F>
                <F label="Price estimate (€)"><Input type="number" value={editing.form.price_estimate} onChange={e => setEditing({ ...editing, form: { ...editing.form, price_estimate: +e.target.value } })} /></F>
                <F label="Type"><Select value={editing.form.type} onValueChange={(v: EventInput["type"]) => setEditing({ ...editing, form: { ...editing.form, type: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["snowboard", "mountain_walk", "skate", "surf"] as const).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></F>
                <F label="Difficulty"><Select value={editing.form.difficulty} onValueChange={(v: EventInput["difficulty"]) => setEditing({ ...editing, form: { ...editing.form, difficulty: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["easy", "moderate", "hard", "expert"] as const).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></F>
                <F label="Status"><Select value={editing.form.status} onValueChange={(v: EventInput["status"]) => setEditing({ ...editing, form: { ...editing.form, status: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["draft", "published", "cancelled", "completed"] as const).map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select></F>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Label className="text-xs">Map coordinates</Label>
                  <Button type="button" size="sm" variant="outline" onClick={lookupCoordinates} disabled={geocoding}>
                    {geocoding ? "Looking up…" : "Find from destination"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Latitude"><Input type="number" step="any" value={editing.form.latitude ?? ""} onChange={e => setEditing({ ...editing, form: { ...editing.form, latitude: e.target.value === "" ? null : +e.target.value } })} /></F>
                  <F label="Longitude"><Input type="number" step="any" value={editing.form.longitude ?? ""} onChange={e => setEditing({ ...editing, form: { ...editing.form, longitude: e.target.value === "" ? null : +e.target.value } })} /></F>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Powers the pin on members' Passport map. "Find from destination" looks it up automatically — you can still fine-tune it by hand.</p>
              </div>
              <F label="Lunch plan"><Input value={editing.form.lunch_plan} onChange={e => setEditing({ ...editing, form: { ...editing.form, lunch_plan: e.target.value } })} /></F>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={editing.form.rental_available} onCheckedChange={(v) => setEditing({ ...editing, form: { ...editing.form, rental_available: !!v } })} />Rental available on site</label>
              <F label="Required equipment"><Textarea value={editing.form.required_equipment} onChange={e => setEditing({ ...editing, form: { ...editing.form, required_equipment: e.target.value } })} /></F>
              <F label="Description"><Textarea rows={4} value={editing.form.description} onChange={e => setEditing({ ...editing, form: { ...editing.form, description: e.target.value } })} /></F>
              <F label="Safety notes"><Textarea value={editing.form.safety_notes} onChange={e => setEditing({ ...editing, form: { ...editing.form, safety_notes: e.target.value } })} /></F>
              <div>
                <Label className="mb-1.5 block text-xs">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_TAGS.map(t => {
                    const on = editing.form.tags.includes(t);
                    return (
                      <button type="button" key={t} onClick={() => setEditing({ ...editing, form: { ...editing.form, tags: on ? editing.form.tags.filter(x => x !== t) : [...editing.form.tags, t] } })}
                        className={`transition ${on ? "ring-2 ring-primary rounded-full" : "opacity-60 hover:opacity-100"}`}>
                        <EventTag tag={t} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button onClick={save} className="w-full">Save trip</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1.5 block text-xs">{label}</Label>{children}</div>;
}
