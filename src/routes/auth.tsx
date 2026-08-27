import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mountain, MailCheck } from "lucide-react";

// Only ever accept same-origin relative paths here, so a crafted
// ?redirect= can't bounce someone to another site after login.
function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { mode?: "login" | "signup"; redirect?: string } => ({
    mode: s.mode === "signup" ? "signup" : s.mode === "login" ? "login" : undefined,
    redirect: safeRedirect(s.redirect),
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, redirect } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Send people back where they were trying to go, not to a generic list.
  useEffect(() => {
    if (user && !loading) navigate({ to: redirect ?? "/trips" });
  }, [user, loading, navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (forgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success(t("auth.reset_sent"));
        setForgot(false);
      } else if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${redirect ?? "/trips"}`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setSentTo(email);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.welcome_back"));
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[80vh] grid place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-lg mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Mountain className="w-4 h-4" />
          </div>
          Nakama
        </Link>

        {sentTo ? (
          <div className="rounded-2xl bg-card border border-border p-6 md:p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center">
              <MailCheck className="w-7 h-7" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">{t("auth.check_email_title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("auth.check_email_body", { email: sentTo })}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">{t("auth.check_email_hint")}</p>
            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={() => {
                setSentTo(null);
                setIsSignup(false);
              }}
            >
              {t("auth.check_email_back")}
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border p-6 md:p-8">
            <h1 className="text-2xl font-bold">
              {forgot
                ? t("auth.reset_title")
                : isSignup
                  ? t("auth.signup_title")
                  : t("auth.login_title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {forgot ? t("auth.reset_sub") : isSignup ? t("auth.signup_sub") : t("auth.login_sub")}
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {isSignup && !forgot && (
                <div>
                  <Label htmlFor="name">{t("auth.full_name")}</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div>
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {!forgot && (
                <div>
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy
                  ? "..."
                  : forgot
                    ? t("auth.send_reset")
                    : isSignup
                      ? t("auth.create_account")
                      : t("auth.sign_in")}
              </Button>
            </form>
            <div className="mt-5 text-sm text-center space-y-2">
              {!forgot && (
                <button
                  onClick={() => setIsSignup(!isSignup)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isSignup ? t("auth.have_account") : t("auth.no_account")}
                </button>
              )}
              {!isSignup && (
                <div>
                  <button
                    onClick={() => setForgot(!forgot)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {forgot ? t("auth.back_to_signin") : t("auth.forgot")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
