import { Link, useRouter, useLocation } from "@tanstack/react-router";
import {
  MountainSnow,
  BookOpen,
  MessageCircle,
  Images,
  Trophy,
  HeartHandshake,
  User,
  Shield,
  LogOut,
  Globe,
  MoreHorizontal,
  Home,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { useI18n } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: LucideIcon };

export function Layout({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const location = useLocation();
  const { lang, setLang, t } = useI18n();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setMoreOpen(false);
    router.navigate({ to: "/" });
  };

  const isActive = (to: string) =>
    to === "/"
      ? location.pathname === "/"
      : location.pathname === to || location.pathname.startsWith(to + "/");

  const initials = (user?.email || "?").slice(0, 2).toUpperCase();

  // Desktop primary (kept clean)
  const desktopPrimary: NavItem[] = user
    ? [
        { to: "/trips", label: t("nav.trips"), icon: MountainSnow },
        { to: "/passport", label: t("nav.passport"), icon: BookOpen },
        { to: "/community", label: t("nav.community"), icon: MessageCircle },
      ]
    : [
        { to: "/", label: t("nav.home"), icon: Home },
        { to: "/trips", label: t("nav.trips"), icon: MountainSnow },
        { to: "/how-it-works", label: t("nav.how_it_works"), icon: BookOpen },
      ];

  const desktopMore: NavItem[] = [
    { to: "/values", label: t("nav.values"), icon: HeartHandshake },
    { to: "/how-it-works", label: t("nav.how_it_works"), icon: BookOpen },
    { to: "/cloud-nine", label: "Cloud Nine", icon: Shield },
    { to: "/ranks", label: "Crew Ranks", icon: Trophy },
    { to: "/gallery", label: t("nav.gallery"), icon: Images },
  ];

  // Mobile bottom — exactly 5
  const mobileBottom: NavItem[] = [
    { to: "/", label: t("nav.home"), icon: Home },
    { to: "/trips", label: t("nav.trips"), icon: MountainSnow },
    { to: "/profile", label: t("nav.profile"), icon: User },
    { to: "/passport", label: t("nav.passport"), icon: BookOpen },
  ];

  // More sheet content
  const moreItems: NavItem[] = [
    { to: "/values", label: t("nav.values"), icon: HeartHandshake },
    { to: "/how-it-works", label: t("nav.how_it_works"), icon: Compass },
    { to: "/cloud-nine", label: "Cloud Nine", icon: Shield },
    { to: "/ranks", label: "Crew Ranks", icon: Trophy },
    { to: "/gallery", label: t("nav.gallery"), icon: Images },
    { to: "/community", label: t("nav.community"), icon: MessageCircle },
  ];


  const NavPill = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const active = isActive(item.to);
    return (
      <Link
        to={item.to}
        className={cn(
          "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap",
          active
            ? "bg-primary/15 text-foreground border border-primary/40 shadow-[0_0_20px_-6px_oklch(0.40_0.17_5/0.6)]"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent"
        )}
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/75 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 h-20 md:h-16 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link
            to="/"
            className="group flex items-center gap-2.5 font-display font-bold text-base shrink-0"
            aria-label="Nakama — home"
          >
            <img
              src="/brand/nakama-logo-transparent.png"
              alt="Nakama logo"
              width={64}
              height={64}
              className="w-16 h-16 md:w-12 md:h-12 object-contain transition-transform group-hover:scale-105"
            />
            <span className="tracking-tight text-[18px] md:text-[17px]">Nakama</span>

          </Link>


          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center min-w-0">
            {desktopPrimary.map((l) => (
              <NavPill key={l.to} item={l} />
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-muted-foreground hover:text-foreground gap-1.5 px-3"
                >
                  <MoreHorizontal className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  <span className="text-sm font-medium">{t("nav.more")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                {desktopMore.map((m) => {
                  const Icon = m.icon;
                  return (
                    <DropdownMenuItem key={m.to} asChild>
                      <Link to={m.to} className="cursor-pointer">
                        <Icon className="w-4 h-4 mr-2" /> {m.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Right (desktop) */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            {isAdmin && (
              <Link
                to="/admin"
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors",
                  isActive("/admin")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                aria-label={t("nav.admin")}
              >
                <Shield className="w-[18px] h-[18px]" strokeWidth={1.75} />
                <span className="hidden lg:inline">{t("nav.admin")}</span>
              </Link>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("nav.language")}>
                  <Globe className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("nav.language")}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setLang("en")} className={lang === "en" ? "font-semibold" : ""}>
                  🇬🇧 English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang("it")} className={lang === "it" ? "font-semibold" : ""}>
                  🇮🇹 Italiano
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {user && <NotificationBell />}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={t("nav.profile")}
                  >
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={undefined} alt="" />
                      <AvatarFallback className="text-xs bg-secondary">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      {t("nav.profile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/passport" className="cursor-pointer">
                      <BookOpen className="w-4 h-4 mr-2" />
                      {t("nav.passport")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/auth" search={{ mode: "login" } as never}>
                  <Button variant="ghost" size="sm">
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link to="/auth" search={{ mode: "signup" } as never}>
                  <Button size="sm">{t("nav.signup")}</Button>
                </Link>
              </>
            )}
          </div>
          {/* Mobile right cluster */}
          <div className="md:hidden flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("nav.language")}>
                  <Globe className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("nav.language")}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setLang("en")} className={lang === "en" ? "font-semibold" : ""}>
                  🇬🇧 English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang("it")} className={lang === "it" ? "font-semibold" : ""}>
                  🇮🇹 Italiano
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {user && <NotificationBell />}

            {!user && (
              <Link to="/auth" search={{ mode: "login" } as never}>
                <Button size="sm" variant="ghost">
                  {t("nav.login")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className={cn("flex-1", user ? "pb-24 md:pb-0" : "pb-0")}>{children}</main>

      {/* Mobile bottom nav — only for logged-in users (Profile/Passport need auth) */}
      {user && (
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/90 backdrop-blur-2xl border-t border-border/60"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid grid-cols-5 h-16">
            {mobileBottom.map((l) => {
              const Icon = l.icon;
              const active = isActive(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full bg-gradient-to-r from-[oklch(0.40_0.17_5)] via-[oklch(0.62_0.24_350)] to-[oklch(0.68_0.18_20)]" />
                  )}
                  <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                  <span className="leading-none">{l.label}</span>
                </Link>
              );
            })}

            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                    moreOpen ? "text-primary" : "text-muted-foreground"
                  )}
                  aria-label={t("nav.more")}
                >
                  <MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={1.75} />
                  <span className="leading-none">{t("nav.more")}</span>
                </button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="rounded-t-3xl max-h-[85vh] overflow-y-auto p-0"
              >
                <SheetHeader className="px-5 pt-5 pb-2 text-left">
                  <SheetTitle className="text-xl font-display">{t("nav.more")}</SheetTitle>
                </SheetHeader>

                <div className="px-3 pb-2">
                  {moreItems.map((m) => {
                    const Icon = m.icon;
                    return (
                      <Link
                        key={m.to}
                        to={m.to}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-secondary/70 transition-colors"
                      >
                        <span className="w-9 h-9 rounded-xl bg-secondary grid place-items-center">
                          <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                        </span>
                        {m.label}
                      </Link>
                    );
                  })}

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-secondary/70 transition-colors"
                    >
                      <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
                        <Shield className="w-[18px] h-[18px]" strokeWidth={1.75} />
                      </span>
                      {t("nav.admin")}
                    </Link>
                  )}
                </div>

                <div className="border-t border-border px-5 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    {t("nav.language")}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={lang === "en" ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setLang("en")}
                    >
                      🇬🇧 English
                    </Button>
                    <Button
                      variant={lang === "it" ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setLang("it")}
                    >
                      🇮🇹 Italiano
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border px-3 py-3">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <span className="w-9 h-9 rounded-xl bg-destructive/10 grid place-items-center">
                      <LogOut className="w-[18px] h-[18px]" strokeWidth={1.75} />
                    </span>
                    {t("nav.logout")}
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      )}

      <footer className={cn("border-t border-border mt-12", user ? "pb-24 md:pb-0" : "")}>
        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-muted-foreground flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/brand/nakama-logo-transparent.png"
              alt=""
              width={22}
              height={22}
              className="w-[22px] h-[22px] object-contain"
            />
            <span className="font-display font-semibold text-foreground">Nakama</span>
            <span>— Nobody gets left behind.</span>
          </div>
          <div className="flex gap-4 flex-wrap">
            <Link to="/values" className="hover:text-foreground">
              {t("nav.values")}
            </Link>
            <Link to="/how-it-works" className="hover:text-foreground">
              {t("nav.how_it_works")}
            </Link>
            <Link to="/cloud-nine" className="hover:text-foreground">
              Cloud Nine
            </Link>
          </div>

        </div>
      </footer>
    </div>
  );
}
