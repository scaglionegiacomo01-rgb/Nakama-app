import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { PublicProfileDialog } from "@/components/PublicProfileDialog";
import { STATUSES, TripPicker, toCSV, download } from "@/lib/admin-shared";

export const Route = createFileRoute("/admin_/registrations")({ component: AdminRegistrationsPage });

function AdminRegistrationsPage() {
  const { ready, loading } = useAdminGuard();
  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">Loading...</div>;
  return (
    <AdminShell title="Registrations" description="Review and confirm who's coming on each trip.">
      <RegistrationsSection />
    </AdminShell>
  );
}

function RegistrationsSection() {
  const qc = useQueryClient();
  const [tripId, setTripId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: regs } = useQuery({
    queryKey: ["admin-regs-section", tripId, filter],
    enabled: !!tripId,
    queryFn: async () => {
      let q = supabase.from("event_registrations").select("*").eq("event_id", tripId!).order("created_at");
      if (filter !== "all") q = q.eq("status", filter as Database["public"]["Enums"]["registration_status"]);
      const { data: regs } = await q;
      if (!regs?.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", regs.map(r => r.user_id));
      return regs.map(r => ({ ...r, profile: profiles?.find(p => p.user_id === r.user_id) }));
    },
  });

  const update = async (id: string, status: Database["public"]["Enums"]["registration_status"]) => {
    const prev = regs?.find(r => r.id === id);
    const isConfirmTransition = status === "confirmed" && prev && (prev.status === "pending" || prev.status === "waitlisted");
    const { error } = await supabase.from("event_registrations").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (isConfirmTransition) {
      toast.success("Participant confirmed. Email system is not configured yet — set up Lovable Emails to send confirmation emails.");
    } else {
      toast.success("Updated");
    }
    qc.invalidateQueries({ queryKey: ["admin-regs-section"] });
  };
  const resendConfirmation = async (id: string) => {
    // Reset flag so once email is configured, the next dispatch will send.
    const { error } = await supabase.from("event_registrations")
      .update({ confirmation_email_sent: false, confirmation_email_sent_at: null, confirmation_email_error: null })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Marked for resend. Email will be sent once Lovable Emails is configured.");
    qc.invalidateQueries({ queryKey: ["admin-regs-section"] });
  };
  const exportCsv = () => {
    if (!regs?.length) return;
    const rows = regs.map(r => ({
      name: r.profile?.full_name ?? r.profile?.username, email: r.profile?.email, phone: r.profile?.phone,
      level: r.profile?.snowboard_level, status: r.status, needs_ride: r.needs_ride,
      offers_seats: r.offers_car_seats, seats: r.available_car_seats, needs_rental: r.needs_rental,
      has_equipment: r.has_equipment, notes: r.notes, created_at: r.created_at,
    }));
    download("registrations.csv", toCSV(rows, Object.keys(rows[0])));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-end">
        <TripPicker value={tripId} onChange={setTripId} />
        <div>
          <Label className="mb-1.5 block text-xs">Filter</Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!regs?.length}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
      </div>

      <div className="mt-4 space-y-3">
        {!tripId && <p className="text-muted-foreground">Pick a trip to view registrations.</p>}
        {tripId && regs?.length === 0 && <p className="text-muted-foreground">No registrations match.</p>}
        {regs?.map(r => (
          <div key={r.id} className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex gap-3 min-w-0">
                <UserAvatar url={r.profile?.profile_picture_url as string | undefined} name={r.profile?.full_name ?? undefined} size="md"
                  onClick={() => { setProfileUserId(r.user_id); setProfileOpen(true); }} />
                <div className="min-w-0">
                  <button onClick={() => { setProfileUserId(r.user_id); setProfileOpen(true); }} className="font-semibold hover:underline text-left">
                    {r.profile?.full_name || (r.profile as { username?: string } | undefined)?.username || "—"}
                  </button>
                  <div className="text-xs text-muted-foreground">{r.profile?.email} · {r.profile?.phone || "no phone"} · {r.profile?.snowboard_level ?? "level n/a"}</div>
                  <div className="mt-1 text-xs flex flex-wrap gap-1">
                    {r.needs_ride && <span className="px-1.5 py-0.5 rounded bg-secondary">Needs ride</span>}
                    {r.offers_car_seats && <span className="px-1.5 py-0.5 rounded bg-secondary">Offers {r.available_car_seats}</span>}
                    {r.needs_rental && <span className="px-1.5 py-0.5 rounded bg-secondary">Rental</span>}
                    {r.has_equipment && <span className="px-1.5 py-0.5 rounded bg-secondary">Has gear</span>}
                    {r.transport_status && <span className="px-1.5 py-0.5 rounded bg-secondary">{r.transport_status}</span>}
                  </div>
                  {r.notes && <div className="mt-1 text-xs italic text-muted-foreground">"{r.notes}"</div>}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 items-end">
                <Select value={r.status} onValueChange={(v: Database["public"]["Enums"]["registration_status"]) => update(r.id, v)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
                {r.status === "confirmed" && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => resendConfirmation(r.id)}>
                    Resend confirmation
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <PublicProfileDialog userId={profileUserId} open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
