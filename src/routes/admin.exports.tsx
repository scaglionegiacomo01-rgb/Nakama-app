import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { TripPicker, toCSV, download } from "@/lib/admin-shared";

export const Route = createFileRoute("/admin/exports")({ component: AdminExportsPage });

function AdminExportsPage() {
  const { ready, loading } = useAdminGuard();
  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">Loading...</div>;
  return (
    <AdminShell title="Exports" description="Download CSVs for offline use or backup.">
      <ExportsSection />
    </AdminShell>
  );
}

function ExportsSection() {
  const [tripId, setTripId] = useState<string | null>(null);

  const exportUsers = async () => {
    const { data } = await supabase.from("profiles").select("full_name, username, email, phone, city, snowboard_level, created_at").limit(2000);
    if (!data?.length) return toast.error("No users to export");
    download("users.csv", toCSV(data, Object.keys(data[0])));
  };
  const exportParticipants = async () => {
    if (!tripId) return toast.error("Pick a trip first");
    const { data: regs } = await supabase.from("event_registrations").select("*").eq("event_id", tripId);
    if (!regs?.length) return toast.error("No participants");
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, username, email, phone, city, snowboard_level").in("user_id", regs.map(r => r.user_id));
    const rows = regs.map(r => {
      const p = profiles?.find(x => x.user_id === r.user_id);
      return { name: p?.full_name ?? p?.username, email: p?.email, phone: p?.phone, city: p?.city, level: p?.snowboard_level, status: r.status, needs_ride: r.needs_ride, offers_seats: r.offers_car_seats, available_seats: r.available_car_seats, needs_rental: r.needs_rental, has_equipment: r.has_equipment };
    });
    download(`participants-${tripId}.csv`, toCSV(rows, Object.keys(rows[0])));
  };
  const exportCarpool = async () => {
    if (!tripId) return toast.error("Pick a trip first");
    const [cars, requests] = await Promise.all([
      supabase.from("trip_cars").select("*").eq("event_id", tripId),
      supabase.from("seat_requests").select("*").eq("event_id", tripId).eq("status", "accepted"),
    ]);
    const userIds = Array.from(new Set([...(cars.data ?? []).map(c => c.driver_user_id), ...(requests.data ?? []).map(r => r.passenger_user_id)]));
    const { data: profiles } = userIds.length ? await supabase.from("profiles").select("user_id, full_name, username").in("user_id", userIds) : { data: [] };
    const rows: Record<string, unknown>[] = [];
    for (const c of cars.data ?? []) {
      const driver = profiles?.find(p => p.user_id === c.driver_user_id);
      rows.push({ role: "driver", name: driver?.full_name ?? driver?.username, departure_area: c.departure_area, seats: c.available_seats, car_id: c.id });
      for (const r of (requests.data ?? []).filter(r => r.car_id === c.id)) {
        const pp = profiles?.find(p => p.user_id === r.passenger_user_id);
        rows.push({ role: "passenger", name: pp?.full_name ?? pp?.username, departure_area: "", seats: 1, car_id: c.id });
      }
    }
    if (!rows.length) return toast.error("No carpool data");
    download(`carpool-${tripId}.csv`, toCSV(rows, Object.keys(rows[0])));
  };
  const exportCheckins = async () => {
    if (!tripId) return toast.error("Pick a trip first");
    const [regs, chk] = await Promise.all([
      supabase.from("event_registrations").select("user_id").eq("event_id", tripId).eq("status", "confirmed"),
      supabase.from("trip_checkins").select("*").eq("event_id", tripId),
    ]);
    const { data: profiles } = (regs.data ?? []).length
      ? await supabase.from("profiles").select("user_id, full_name, username, phone").in("user_id", (regs.data ?? []).map(r => r.user_id))
      : { data: [] };
    const rows = (regs.data ?? []).map(r => {
      const p = profiles?.find(x => x.user_id === r.user_id);
      const c = chk.data?.find(x => x.user_id === r.user_id);
      return { name: p?.full_name ?? p?.username, phone: p?.phone, status: c?.status ?? "not_checked_in", meeting_point_at: c?.meeting_point_checked_in_at ?? "", destination_at: c?.destination_checked_in_at ?? "", returned_at: c?.return_checked_in_at ?? "" };
    });
    if (!rows.length) return toast.error("No confirmed participants");
    download(`checkin-${tripId}.csv`, toCSV(rows, Object.keys(rows[0])));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold">Global exports</h3>
        <Button variant="outline" className="mt-2" onClick={exportUsers}><Download className="w-4 h-4 mr-1" />Users (CSV)</Button>
      </div>
      <div>
        <h3 className="font-bold">Trip exports</h3>
        <div className="mt-2"><TripPicker value={tripId} onChange={setTripId} label="Pick a trip" /></div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportParticipants} disabled={!tripId}><Download className="w-4 h-4 mr-1" />Participants</Button>
          <Button variant="outline" onClick={exportCarpool} disabled={!tripId}><Download className="w-4 h-4 mr-1" />Carpool</Button>
          <Button variant="outline" onClick={exportCheckins} disabled={!tripId}><Download className="w-4 h-4 mr-1" />Check-in list</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">CSV files include operational fields only — emergency contacts are kept inside the trip details view.</p>
      </div>
    </div>
  );
}
