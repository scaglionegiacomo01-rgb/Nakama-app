import { type ReactNode, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarDays, Users, Car, ClipboardCheck, Camera,
  UserCog, Bell, Download, Palette, ShieldCheck, Menu,
} from "lucide-react";
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <SidebarMenu>
      {NAV.map((item) => (
        <SidebarMenuItem key={item.to}>
          <SidebarMenuButton asChild isActive={isNavActive(pathname, item.to)} onClick={onNavigate}>
            <Link to={item.to}>
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
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
    <SidebarProvider defaultOpen className="min-h-0 w-full block">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />Admin
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm"><Menu className="w-4 h-4 mr-1" />Menu</Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground">
              <SheetHeader className="p-4 border-b border-sidebar-border">
                <SheetTitle className="text-left text-sidebar-foreground">Admin</SheetTitle>
              </SheetHeader>
              <div className="p-2">
                <NavList pathname={location.pathname} onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mt-4 md:mt-0 flex gap-6 items-start">
          {/* Desktop rail */}
          <Sidebar collapsible="none" className="hidden md:flex w-56 shrink-0 rounded-2xl border border-sidebar-border overflow-hidden">
            <SidebarHeader className="border-b border-sidebar-border">
              <div className="flex items-center gap-2 px-2 py-1 text-xs uppercase tracking-[0.2em] text-sidebar-foreground/70">
                <ShieldCheck className="w-3.5 h-3.5" />Admin
              </div>
            </SidebarHeader>
            <SidebarContent className="p-2">
              <NavList pathname={location.pathname} />
            </SidebarContent>
          </Sidebar>

          {/* Page content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
                {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
              </div>
              {actions}
            </div>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
