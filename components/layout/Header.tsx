"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LogOut, ChevronDown, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user: User;
  workshopName: string;
}

export function Header({ user, workshopName }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
      {/* Breadcrumb / title — wypełniany przez poszczególne strony */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:block">
          {workshopName}
        </span>
      </div>

      {/* Menu użytkownika */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
        >
          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
            <UserIcon className="h-4 w-4 text-primary" />
          </div>
          <span className="hidden sm:block max-w-[160px] truncate text-foreground">
            {user.email}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {menuOpen && (
          <>
            {/* Overlay do zamknięcia */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-md border bg-popover shadow-md">
              <div className="px-3 py-2 border-b">
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-none"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Wyloguj się
              </Button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
