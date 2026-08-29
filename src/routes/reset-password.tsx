import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({ component: ResetPassword });

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("reset.toast_updated"));
      navigate({ to: "/trips" });
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-[80vh] grid place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4">
        <h1 className="text-2xl font-bold">{t("reset.title")}</h1>
        <div><Label>{t("reset.new_password")}</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "..." : t("reset.submit")}</Button>
      </form>
    </div>
  );
}
