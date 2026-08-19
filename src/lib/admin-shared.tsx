import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const STATUSES = ["pending", "confirmed", "waitlisted", "rejected", "cancelled"] as const;
export const CHECKIN_LABELS: Record<string, string> = {
  not_checked_in: "Not checked in",
  arrived_meeting_point: "At meeting point",
  arrived_destination: "At resort",
  returned: "Back safely",
  absent: "Absent",
  cancelled: "Cancelled",
};

export function toCSV(rows: Record<string, unknown>[], headers: string[]) {
  const head = headers.join(",");
  const body = rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`).join(",")).join("\n");
  return head + "\n" + body;
}
export function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function useTripList() {
  return useQuery({
    queryKey: ["admin-trip-picker"],
    queryFn: async () => (await supabase.from("events").select("id, title, destination, date, status").order("date", { ascending: false })).data ?? [],
  });
}

export function TripPicker({ value, onChange, label = "Select trip" }: { value: string | null; onChange: (v: string) => void; label?: string }) {
  const { data } = useTripList();
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <Select value={value ?? undefined} onValueChange={onChange}>
        <SelectTrigger className="w-full md:w-96"><SelectValue placeholder="Pick a trip…" /></SelectTrigger>
        <SelectContent>{(data ?? []).map(e => (
          <SelectItem key={e.id} value={e.id}>{e.title} — {new Date(e.date).toLocaleDateString()} <span className="text-muted-foreground">({e.status})</span></SelectItem>
        ))}</SelectContent>
      </Select>
    </div>
  );
}

export function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${warn ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
    </div>
  );
}
