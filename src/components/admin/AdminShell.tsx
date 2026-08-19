import { type ReactNode, useState } from "react";
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
  Palette,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
  { to: "/admin/brand", label: "Brand", icon: Palette },
] as const;

function isNavActive(pathname: string, to: string) {
  return to === "/admin" ? pathname === "/admin" : pathname === to || pathname.startsWith(to + "/");
}

// Plain links, no shadcn Sidebar primitives — keeps this interactive on the
// very first render (no extra context providers/hooks between the tap and
// the <Link>) and matches the bottom-sheet nav already proven in Layout.tsx.
function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isNavActive(pathname, item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
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
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Menu className="w-4 h-4 mr-1" />
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto p-0">
            <SheetHeader className="px-5 pt-5 pb-2 text-left">
              <SheetTitle className="text-xl font-display">Admin</SheetTitle>
            </SheetHeader>
            <div className="px-3 pb-6">
              <NavList pathname={location.pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-3 md:mt-0 flex gap-6 items-start">
        {/* Desktop rail */}
        <div className="hidden md:flex md:flex-col w-56 shrink-0 rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-[0.2em] text-sidebar-foreground/70 border-b border-sidebar-border">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </div>
          <div className="p-2">
            <NavList pathname={location.pathname} />
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
