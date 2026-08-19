import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

// Single auth guard for every /admin* route: replaces four slightly
// different hand-rolled versions that used to live in each admin page.
export function useAdminGuard() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!isAdmin) { toast.error("Admin access required"); navigate({ to: "/" }); }
  }, [user, isAdmin, loading, navigate]);

  return { userId: user?.id, loading, ready: !loading && !!user && isAdmin };
}
