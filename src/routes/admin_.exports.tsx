import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { TripPicker, toCSV, download } from "@/lib/admin-shared";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin_/exports")({ component: AdminExportsPage });

function AdminExportsPage() {
  const { ready, loading } = useAdminGuard();
  const { t } = useI18n();
  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">{t("common.loading")}</div>;
  return (
    <AdminShell title={t("admin.nav_exports")} description={t("admin.exports_desc")}>
      <ExportsSection />
    </AdminShell>
  );
}

function ExportsSection() {
  const { t } = useI18n();
  const [tripId, setTripId] = useState<string | null>(null);

  const exportUsers = async () => {
    const { data } = await supabase.from("profiles").select("full_name, username, email, phone, city, snowboard_level, created_at").limit(2000);
    if (!data?.length) return toast.error(t("admin.toast_no_users_export"));
    download("users.csv", toCSV(data, Object.keys(data[0])));
  };
  const exportParticipants = async () => {
    if (!tripId) return toast.error(t("admin.toast_pick_trip_first"));
    const { data: regs } = await supabase.from("event_registrations").select("*").eq("event_id", tripId);
    if (!regs?.length) return toast.error(t("admin.toast_no_participants"));
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, username, email, phone, city, snowboard_level").in("user_id", regs.map(r => r.user_id));
    const rows = regs.map(r => {
      const p = profiles?.find(x => x.user_id === r.user_id);
      return { name: p?.full_name ?? p?.username, email: p?.email, phone: p?.phone, city: p?.city, level: p?.snowboard_level, status: r.status, needs_ride: r.needs_ride, offers_seats: r.offers_car_seats, available_seats: r.available_car_seats, needs_rental: r.needs_rental, has_equipment: r.has_equipment };
    });
    download(`participants-${tripId}.csv`, toCSV(rows, Object.keys(rows[0])));
  };
  const exportCarpool = async () => {
    if (!tripId) return toast.error(t("admin.toast_pick_trip_first"));
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
    if (!rows.length) return toast.error(t("admin.toast_no_carpool_data"));
    download(`carpool-${tripId}.csv`, toCSV(rows, Object.keys(rows[0])));
  };
  const exportCheckins = async () => {
    if (!tripId) return toast.error(t("admin.toast_pick_trip_first"));
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
    if (!rows.length) return toast.error(t("admin.toast_no_confirmed_participants"));
    download(`checkin-${tripId}.csv`, toCSV(rows, Object.keys(rows[0])));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold">{t("admin.global_exports")}</h3>
        <Button variant="outline" className="mt-2" onClick={exportUsers}><Download className="w-4 h-4 mr-1" />{t("admin.users_csv")}</Button>
      </div>
      <div>
        <h3 className="font-bold">{t("admin.trip_exports")}</h3>
        <div className="mt-2"><TripPicker value={tripId} onChange={setTripId} label={t("admin.pick_a_trip_placeholder")} /></div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportParticipants} disabled={!tripId}><Download className="w-4 h-4 mr-1" />{t("admin.export_participants")}</Button>
          <Button variant="outline" onClick={exportCarpool} disabled={!tripId}><Download className="w-4 h-4 mr-1" />{t("admin.export_carpool")}</Button>
          <Button variant="outline" onClick={exportCheckins} disabled={!tripId}><Download className="w-4 h-4 mr-1" />{t("admin.export_checkin_list")}</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">{t("admin.exports_hint")}</p>
      </div>
    </div>
  );
}
