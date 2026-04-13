"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Users,
  Car,
  Bell,
  Settings,
  Wrench,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/calendar", label: "Kalendarz", icon: CalendarDays },
  { href: "/vehicles", label: "Pojazdy", icon: Car },
  { href: "/customers", label: "Klienci", icon: Users },
  { href: "/reminders", label: "Przypomnienia", icon: Bell },
];

const settingsItems = [
  { href: "/settings", label: "Ustawienia", icon: Settings },
  { href: "/settings/billing", label: "Subskrypcja", icon: CreditCard },
];

const planLabels: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" }> = {
  trial: { label: "Trial", variant: "warning" },
  starter: { label: "Starter", variant: "secondary" },
  pro: { label: "Pro", variant: "success" },
  expired: { label: "Wygasły", variant: "destructive" as never },
};

interface SidebarProps {
  workshopName: string;
  plan: string;
  role: string;
}

export function Sidebar({ workshopName, plan, role }: SidebarProps) {
  const pathname = usePathname();
  const planInfo = planLabels[plan] ?? { label: plan, variant: "secondary" };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
      {/* Logo + nazwa warsztatu */}
      <div className="flex items-center gap-3 p-5 border-b border-sidebar-border">
        <div className="bg-primary/20 p-2 rounded-lg shrink-0">
          <Wrench className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{workshopName}</p>
          <Badge variant={planInfo.variant} className="text-xs mt-0.5">
            {planInfo.label}
          </Badge>
        </div>
      </div>

      {/* Nawigacja główna */}
      <nav className="flex-1 p-3 space-y-1">
        <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 py-2">
          Menu
        </p>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 py-2 mt-4">
          Administracja
        </p>
        {settingsItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              pathname === href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Stopka */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/40 text-center">
          WarsztatPro v0.1
        </p>
      </div>
    </aside>
  );
}
