import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MailCheck, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import heroImg from "@/assets/hero-mountain.jpg";

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
  const [showPassword, setShowPassword] = useState(false);

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

  const fieldClass =
    "h-[46px] rounded-[14px] bg-[oklch(0.24_0.028_290)] border border-border px-[14px] text-[14px] w-full focus:outline-none focus-within:border-nakama-pink";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img
        src={heroImg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "40% 20%" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.13 0.012 250 / .45) 0%, oklch(0.40 0.17 5 / .18) 25%, oklch(0.13 0.012 250 / .92) 55%, oklch(0.13 0.012 250) 100%)",
        }}
      />

      <div className="relative min-h-screen flex flex-col px-5 pb-10 max-w-md mx-auto">
        <Link to="/" className="flex items-center gap-2.5 pt-8 shrink-0">
          <img
            src="/brand/nakama-logo-transparent.png"
            alt=""
            className="w-[38px] h-[38px] object-contain"
          />
          <span className="text-[10px] font-bold tracking-[0.28em]">NAKAMA</span>
        </Link>

        <div className="flex-1" />

        {sentTo ? (
          <div className="nakama-glass rounded-[26px] border border-border p-[18px] text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/15 text-primary grid place-items-center">
              <MailCheck className="w-7 h-7" />
            </div>
            <h1 className="mt-4 font-display text-2xl">{t("auth.check_email_title")}</h1>
            <p className="mt-2 text-sm text-foreground/80">
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
          <>
            <h1 className="font-display text-[38px] leading-[1.0] tracking-[-0.045em]">
              {forgot
                ? t("auth.reset_title")
                : isSignup
                  ? t("auth.signup_title")
                  : t("auth.login_title")}
            </h1>
            <p className="mt-2.5 text-[14px] text-foreground/80">
              {forgot ? t("auth.reset_sub") : isSignup ? t("auth.signup_sub") : t("auth.login_sub")}
            </p>

            <div className="nakama-glass mt-[22px] rounded-[26px] border border-border p-[18px]">
              {!forgot && (
                <div className="grid grid-cols-2 gap-1 p-1 rounded-[14px] bg-[oklch(0.16_0.014_250/0.7)]">
                  <button
                    type="button"
                    onClick={() => setIsSignup(false)}
                    className={cn(
                      "py-[9px] rounded-[11px] text-[13px] font-bold text-center transition",
                      !isSignup ? "bg-primary" : "text-muted-foreground",
                    )}
                  >
                    {t("auth.sign_in")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSignup(true)}
                    className={cn(
                      "py-[9px] rounded-[11px] text-[13px] font-bold text-center transition",
                      isSignup ? "bg-primary" : "text-muted-foreground",
                    )}
                  >
                    {t("auth.tab_signup")}
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className={cn(!forgot && "mt-4")}>
                {isSignup && !forgot && (
                  <div>
                    <label
                      htmlFor="name"
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground whitespace-nowrap"
                    >
                      {t("auth.full_name")}
                    </label>
                    <input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className={cn(fieldClass, "mt-[7px]")}
                    />
                  </div>
                )}
                <div className={cn(isSignup && !forgot && "mt-[14px]")}>
                  <label
                    htmlFor="email"
                    className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground whitespace-nowrap"
                  >
                    {t("auth.email")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={cn(fieldClass, "mt-[7px]")}
                  />
                </div>
                {!forgot && (
                  <div className="mt-[14px]">
                    <label
                      htmlFor="password"
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground whitespace-nowrap"
                    >
                      {t("auth.password")}
                    </label>
                    <div
                      className={cn(fieldClass, "mt-[7px] flex items-center justify-between gap-2")}
                    >
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="min-w-0 flex-1 bg-transparent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="shrink-0 text-muted-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-[17px] h-[17px]" />
                        ) : (
                          <Eye className="w-[17px] h-[17px]" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="nk-sheen relative overflow-hidden mt-[18px] w-full h-[50px] rounded-[16px] bg-gradient-to-br from-[oklch(0.45_0.19_5)] to-[oklch(0.36_0.15_355)] text-white text-[15px] font-semibold shadow-[0_12px_30px_-14px_oklch(0.40_0.17_5)] disabled:opacity-60 transition"
                >
                  {busy
                    ? "..."
                    : forgot
                      ? t("auth.send_reset")
                      : isSignup
                        ? t("auth.create_account")
                        : t("auth.sign_in")}
                </button>
                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => setForgot(!forgot)}
                    className="mt-[14px] w-full text-center text-[12.5px] text-muted-foreground"
                  >
                    {forgot ? t("auth.back_to_signin") : t("auth.forgot")}
                  </button>
                )}
              </form>
            </div>

            {!forgot && (
              <div className="mt-[18px] text-center text-[12.5px]">
                <button
                  onClick={() => setIsSignup(!isSignup)}
                  className="font-semibold text-nakama-coral hover:opacity-80"
                >
                  {isSignup ? t("auth.have_account") : t("auth.no_account")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
