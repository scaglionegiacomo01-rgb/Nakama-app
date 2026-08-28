import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Car,
  ClipboardCheck,
  Camera,
  UserCog,
  Bell,
  Download,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/trips", label: "Trips", icon: CalendarDays },
  { to: "/admin/registrations", label: "Registrations", icon: Users },
  { to: "/admin/carpool", label: "Carpool", icon: Car },
  { to: "/admin/rollcall", label: "Roll call", icon: ClipboardCheck },
  { to: "/admin/gallery", label: "Gallery", icon: Camera },
  { to: "/admin/users", label: "Users", icon: UserCog },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/exports", label: "Exports", icon: Download },
] as const;

function isNavActive(pathname: string, to: string) {
  return to === "/admin" ? pathname === "/admin" : pathname === to || pathname.startsWith(to + "/");
}

// Desktop rail: plain <Link>, no portal, no custom onClick composition — the
// simplest possible thing that can navigate.
function DesktopNav({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isNavActive(pathname, item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

// Mobile menu: a plain, hand-rolled overlay+panel. Nav items are real <a
// href> tags — NOT TanStack Router's <Link> and NOT an onClick+navigate()
// call. Two rebuilds using the client-side router (first inside a Radix
// Sheet, then a hand-rolled panel with an imperative navigate()) both
// reportedly still did nothing on tap on a real device, even though both
// tested fine locally. A plain anchor's navigation is handled by the
// browser itself, not by any of our JS running correctly — even if some
// as-yet-unidentified issue is swallowing the tap before our React handlers
// ever see it, the browser's own default action for tapping a link still
// fires. This trades the client-side transition for a full page load, but
// a full page load that actually arrives beats an instant one that doesn't.
function MobileNav({
  pathname,
  open,
  onClose,
}: {
  pathname: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <span className="text-xl font-display font-semibold">Admin</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-3 pb-6">
          {NAV.map((item) => {
            const active = isNavActive(pathname, item.to);
            return (
              <a
                key={item.to}
                href={item.to}
                onClick={onClose}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-left transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-foreground/85 hover:bg-secondary/70",
                )}
              >
                <span className="w-9 h-9 rounded-xl bg-secondary grid place-items-center shrink-0">
                  <item.icon className="w-[18px] h-[18px]" />
                </span>
                {item.label}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 md:py-8">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          Admin
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-secondary transition-colors"
        >
          <Menu className="w-4 h-4" />
          Menu
        </button>
        <MobileNav
          pathname={location.pathname}
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      </div>

      <div className="mt-3 md:mt-0 flex gap-6 items-start">
        {/* Desktop rail */}
        <div className="hidden md:flex md:flex-col w-56 shrink-0 rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-[0.2em] text-sidebar-foreground/70 border-b border-sidebar-border">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </div>
          <div className="p-2">
            <DesktopNav pathname={location.pathname} />
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
              {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
            </div>
            {actions}
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
