import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { PublicProfileDialog } from "@/components/PublicProfileDialog";
import { EVENT_TAGS } from "@/lib/event-tags";
import { EventTag } from "@/components/EventTag";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Tag as TagIcon } from "lucide-react";

export const Route = createFileRoute("/admin/events/$id")({ component: EventAdmin });

const statuses = ["pending","confirmed","waitlisted","cancelled","rejected"];

function EventAdmin() {
  const { id } = Route.useParams();
  const { ready, loading } = useAdminGuard();
  const qc = useQueryClient();
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: event } = useQuery({
    queryKey: ["admin-event", id], enabled: ready,
    queryFn: async () => (await supabase.from("events").select("*").eq("id", id).maybeSingle()).data,
  });

  const { data: regs } = useQuery({
    queryKey: ["admin-regs", id], enabled: ready,
    queryFn: async () => {
      const { data: registrations } = await supabase.from("event_registrations").select("*").eq("event_id", id).order("created_at");
      if (!registrations || registrations.length === 0) return [];
      const userIds = registrations.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", userIds);
      return registrations.map(r => ({ ...r, profile: profiles?.find(p => p.user_id === r.user_id) }));
    },
  });

  const toggleTag = async (tag: string) => {
    const current = (event?.tags as string[] | undefined) ?? [];
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
    const { error } = await supabase.from("events").update({ tags: next }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["admin-event", id] });
  };

  const toggleSafety = async (field: "safety_meeting_point_ok" | "safety_destination_ok" | "safety_return_ok", value: boolean) => {
    const patch: Partial<Record<typeof field, boolean>> = { [field]: value };
    const { error } = await supabase.from("events").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else { qc.invalidateQueries({ queryKey: ["admin-event", id] }); toast.success("Safety status updated"); }
  };

  const updateStatus = async (regId: string, status: Database["public"]["Enums"]["registration_status"]) => {
    const { error } = await supabase.from("event_registrations").update({ status }).eq("id", regId);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-regs", id] }); }
  };

  const exportCsv = () => {
    if (!regs) return;
    const headers = ["Name","Email","Phone","City","Status","Needs ride","Offers seats","Available seats","Needs rental","Has equipment","Emergency contact","Emergency phone","Notes"];
    const rows = regs.map(r => [
      r.profile?.full_name, r.profile?.email, r.profile?.phone, r.profile?.city, r.status,
      r.needs_ride, r.offers_car_seats, r.available_car_seats, r.needs_rental, r.has_equipment,
      r.profile?.emergency_contact_name, r.profile?.emergency_contact_phone, (r.notes ?? "").replace(/\n/g," "),
    ].map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `participants-${event?.title ?? id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">Loading...</div>;

  return (
    <AdminShell
      title={event?.title ?? "Trip"}
      description={event ? `${event.destination} · ${new Date(event.date).toLocaleDateString()}` : undefined}
      actions={<Button onClick={exportCsv} variant="outline"><Download className="w-4 h-4 mr-1" />Export CSV</Button>}
    >
      {/* Event tags */}
      <div className="mt-8 rounded-2xl bg-card border border-border p-5">
        <h2 className="text-lg font-bold inline-flex items-center gap-2"><TagIcon className="w-4 h-4 text-primary" />Event tags</h2>
        <p className="text-xs text-muted-foreground mt-1">Highlight the vibe so members can pick the right trip.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EVENT_TAGS.map(t => {
            const on = ((event?.tags as string[] | undefined) ?? []).includes(t);
            return (
              <button key={t} type="button" onClick={() => toggleTag(t)}
                className={`transition ${on ? "ring-2 ring-primary rounded-full" : "opacity-60 hover:opacity-100"}`}>
                <EventTag tag={t} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Safety checklist */}
      <div className="mt-4 rounded-2xl bg-card border border-border p-5">
        <h2 className="text-lg font-bold inline-flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Safety checklist</h2>
        <p className="text-xs text-muted-foreground mt-1">Confirm each stage of the trip is safe and members are accounted for.</p>
        <div className="mt-3 space-y-2">
          {(
            [
              { key: "safety_meeting_point_ok", label: "Meeting point OK — everyone gathered" },
              { key: "safety_destination_ok", label: "Destination OK — group arrived safely" },
              { key: "safety_return_ok", label: "Return OK — everyone back safely" },
            ] as const
          ).map(({ key, label }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={!!event?.[key]} onCheckedChange={v => toggleSafety(key, !!v)} className="mt-0.5" />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <h2 className="mt-8 text-xl font-bold">Participants ({regs?.length ?? 0})</h2>
      <div className="mt-4 space-y-3">
        {regs?.map(r => (
          <div key={r.id} className="rounded-2xl bg-card border border-border p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex gap-3">
                <UserAvatar url={r.profile?.profile_picture_url as string | undefined} name={r.profile?.full_name} size="md" onClick={() => { setProfileUserId(r.user_id); setProfileOpen(true); }} />
                <div className="min-w-0">
                  <button className="font-semibold hover:underline text-left" onClick={() => { setProfileUserId(r.user_id); setProfileOpen(true); }}>
                    {r.profile?.full_name || (r.profile as { username?: string } | undefined)?.username || "—"}
                  </button>
                  <div className="text-sm text-muted-foreground">{r.profile?.email} · {r.profile?.phone || "no phone"}</div>
                  <div className="text-sm text-muted-foreground">{r.profile?.city}</div>
                  <div className="mt-2 text-xs space-x-2">
                    {r.needs_ride && <span className="px-2 py-0.5 rounded-full bg-secondary">Needs ride</span>}
                    {r.offers_car_seats && <span className="px-2 py-0.5 rounded-full bg-secondary">Offers {r.available_car_seats} seats</span>}
                    {r.needs_rental && <span className="px-2 py-0.5 rounded-full bg-secondary">Needs rental</span>}
                    {r.has_equipment && <span className="px-2 py-0.5 rounded-full bg-secondary">Has gear</span>}
                  </div>
                  {r.notes && <div className="mt-2 text-sm italic text-muted-foreground">"{r.notes}"</div>}
                  <div className="mt-2 text-xs text-destructive">Emergency: {r.profile?.emergency_contact_name} {r.profile?.emergency_contact_phone}</div>
                </div>
              </div>
              <Select value={r.status} onValueChange={(v: Database["public"]["Enums"]["registration_status"]) => updateStatus(r.id, v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {regs && regs.length === 0 && <p className="text-muted-foreground">No participants yet.</p>}
      </div>
      <PublicProfileDialog userId={profileUserId} open={profileOpen} onOpenChange={setProfileOpen} />
    </AdminShell>
  );
}
