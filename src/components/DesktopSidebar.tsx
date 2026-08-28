import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  MountainSnow,
  BookOpen,
  MessageCircle,
  Images,
  Trophy,
  Shield,
  Settings,
  LogOut,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { getRank } from "@/lib/ranks";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; label: string; icon: LucideIcon };

export function DesktopSidebar({ isAdmin }: { isAdmin: boolean }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const location = useLocation();
  const { lang, setLang, t } = useI18n();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username, profile_picture_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as {
        full_name: string | null;
        username: string | null;
        profile_picture_url: string | null;
      } | null;
    },
  });

  const { data: completed } = useQuery({
    queryKey: ["sidebar-completed-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("event_id, events(status)")
        .eq("user_id", user!.id)
        .eq("status", "confirmed");
      const rows = (data ?? []) as unknown as { events: { status: string } | null }[];
      return rows.filter((r) => r.events?.status === "completed").length;
    },
  });

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const items: NavItem[] = [
    { to: "/", label: t("nav.home"), icon: Home },
    { to: "/trips", label: t("nav.trips"), icon: MountainSnow },
    { to: "/passport", label: t("nav.passport"), icon: BookOpen },
    { to: "/community", label: t("nav.community"), icon: MessageCircle },
    { to: "/gallery", label: t("nav.gallery"), icon: Images },
    { to: "/ranks", label: t("nav.ranks"), icon: Trophy },
  ];

  const displayName = profile?.full_name || profile?.username || user?.email || "";
  const rank = typeof completed === "number" ? getRank(completed) : null;

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/" });
  };

  return (
    <aside className="hidden lg:flex w-[250px] shrink-0 flex-col border-r border-border bg-[var(--sidebar)] sticky top-0 h-screen p-4 overflow-y-auto">
      <Link to="/" className="flex items-center gap-[11px] px-1.5">
        <img
          src="/brand/nakama-logo-transparent.png"
          alt=""
          className="w-9 h-9 object-contain shrink-0"
        />
        <span className="text-[11px] font-bold tracking-[0.28em]">NAKAMA</span>
      </Link>

      <nav className="mt-7 flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-[11px] px-3.5 py-2.5 rounded-[14px] text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground font-medium hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon className="w-[19px] h-[19px]" strokeWidth={active ? 2 : 1.75} />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-[11px] px-3.5 py-2.5 rounded-[14px] text-sm transition-colors",
              isActive("/admin")
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground font-medium hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Shield className="w-[19px] h-[19px]" strokeWidth={isActive("/admin") ? 2 : 1.75} />
            {t("nav.admin")}
          </Link>
        )}
      </nav>

      <div className="flex-1" />

      <Link
        to="/cloud-nine"
        className="rounded-[18px] p-[15px] border transition hover:opacity-90"
        style={{
          background: "linear-gradient(135deg, oklch(0.40 0.17 5 / .3), oklch(0.34 0.07 320 / .2))",
          borderColor: "oklch(0.40 0.17 5 / .45)",
        }}
      >
        <div className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-nakama-coral whitespace-nowrap">
          {t("nav.cloud_nine")}
        </div>
        <div className="mt-[7px] font-display text-[16px] leading-[1.2] tracking-[-0.03em]">
          {t("cloudnine.sidebar_title")}
        </div>
        <div className="mt-[9px] text-[11.5px] text-muted-foreground">
          {t("nav.cloud_nine_tagline")}
        </div>
      </Link>

      <div className="mt-4 flex items-center gap-[11px] px-1.5 py-2">
        <UserAvatar
          url={profile?.profile_picture_url}
          name={displayName}
          className="h-9 w-9 text-xs shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold truncate">{displayName}</div>
          {rank && (
            <div className="text-[11px] text-muted-foreground truncate">
              {rank.emoji} {rank.title}
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={t("nav.settings")}
            >
              <Settings className="w-[17px] h-[17px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer">
                {t("nav.profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> {t("nav.language")}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setLang("en")}
              className={cn("cursor-pointer", lang === "en" && "font-semibold")}
            >
              🇬🇧 English
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLang("it")}
              className={cn("cursor-pointer", lang === "it" && "font-semibold")}
            >
              🇮🇹 Italiano
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" /> {t("nav.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
