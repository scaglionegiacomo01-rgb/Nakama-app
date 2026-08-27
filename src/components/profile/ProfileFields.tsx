import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

/** Small presentational building blocks shared by the profile page. */

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/60 border border-border p-2.5 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display font-bold text-sm truncate">{value}</div>
    </div>
  );
}

export function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium text-sm truncate">{value}</div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

export function Toggle({
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
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5" />
      <span className="text-sm">{label}</span>
    </label>
  );
}
