"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, Car, Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/calendar", label: "Kalendarz", icon: CalendarDays },
  { href: "/vehicles", label: "Pojazdy", icon: Car },
  { href: "/customers", label: "Klienci", icon: Users },
  { href: "/reminders", label: "Reminder", icon: Bell },
  { href: "/settings", label: "Ustawienia", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t bg-background">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", active && "text-primary")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
