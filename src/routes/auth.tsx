import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mountain } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "login" | "signup" } => ({
    mode: s.mode === "signup" ? "signup" : s.mode === "login" ? "login" : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  useEffect(() => { if (user && !loading) navigate({ to: "/trips" }); }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (forgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Password reset email sent");
        setForgot(false);
      } else if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to verify.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-[80vh] grid place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-lg mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center"><Mountain className="w-4 h-4" /></div>
          Nakama
        </Link>
        <div className="rounded-2xl bg-card border border-border p-6 md:p-8">
          <h1 className="text-2xl font-bold">{forgot ? "Reset password" : isSignup ? "Join the crew" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {forgot ? "We'll email you a reset link." : isSignup ? "Create your account to join trips." : "Sign in to join trips and see your crew."}
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignup && !forgot && (
              <div><Label htmlFor="name">Full name</Label><Input id="name" value={fullName} onChange={e => setFullName(e.target.value)} required /></div>
            )}
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            {!forgot && (
              <div><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "..." : forgot ? "Send reset link" : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>
          <div className="mt-5 text-sm text-center space-y-2">
            {!forgot && (
              <button onClick={() => setIsSignup(!isSignup)} className="text-muted-foreground hover:text-foreground">
                {isSignup ? "Already have an account? Sign in" : "New here? Create an account"}
              </button>
            )}
            {!isSignup && (
              <div><button onClick={() => setForgot(!forgot)} className="text-muted-foreground hover:text-foreground">{forgot ? "Back to sign in" : "Forgot password?"}</button></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
