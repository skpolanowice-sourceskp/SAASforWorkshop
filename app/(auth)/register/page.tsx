"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Wrench, ChevronRight, ChevronLeft } from "lucide-react";

// Krok 1: dane konta
const accountSchema = z.object({
  email: z.string().email("Podaj prawidłowy adres email"),
  password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną dużą literę")
    .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Hasła nie są identyczne",
  path: ["confirmPassword"],
});

// Krok 2: dane warsztatu
const workshopSchema = z.object({
  workshopName: z.string().min(2, "Nazwa warsztatu jest wymagana"),
  phone: z
    .string()
    .regex(/^\+?48\d{9}$|^\d{9}$/, "Podaj prawidłowy numer telefonu PL")
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
  stationCount: z.coerce
    .number()
    .min(1, "Min. 1 stanowisko")
    .max(5, "Maks. 5 stanowisk"),
});

type AccountFormData = z.infer<typeof accountSchema>;
type WorkshopFormData = z.infer<typeof workshopSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountData, setAccountData] = useState<AccountFormData | null>(null);

  const accountForm = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: { stationCount: 2 } as never,
  });

  const workshopForm = useForm<WorkshopFormData>({
    resolver: zodResolver(workshopSchema),
    defaultValues: { stationCount: 2 },
  });

  const handleAccountSubmit = (data: AccountFormData) => {
    setAccountData(data);
    setStep(2);
  };

  const handleWorkshopSubmit = async (workshopData: WorkshopFormData) => {
    if (!accountData) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // 1. Utwórz konto użytkownika
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: accountData.email,
      password: accountData.password,
    });

    if (signUpError || !authData.user) {
      setError(signUpError?.message ?? "Błąd rejestracji. Spróbuj ponownie.");
      setLoading(false);
      return;
    }

    // 2. Utwórz warsztat przez Server Action (route handler)
    const res = await fetch("/api/workshops/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: authData.user.id,
        name: workshopData.workshopName,
        phone: workshopData.phone || null,
        address: workshopData.address || null,
        stationCount: workshopData.stationCount,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Błąd tworzenia warsztatu.");
      setLoading(false);
      return;
    }

    router.push("/calendar");
    router.refresh();
  };

  return (
    <Card className="border-slate-700 bg-slate-800/80 backdrop-blur text-slate-100 shadow-2xl">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="bg-primary/20 p-3 rounded-full">
            <Wrench className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-white">
          {step === 1 ? "Utwórz konto" : "Dane warsztatu"}
        </CardTitle>
        <CardDescription className="text-slate-400">
          Krok {step} z 2 —{" "}
          {step === 1 ? "dane logowania" : "konfiguracja warsztatu"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/20 border border-destructive/50 px-3 py-2 text-sm text-destructive-foreground mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <form
            onSubmit={accountForm.handleSubmit(handleAccountSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jan@warsztat.pl"
                {...accountForm.register("email")}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              {accountForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {accountForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">Hasło</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...accountForm.register("password")}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              {accountForm.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {accountForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-200">
                Potwierdź hasło
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...accountForm.register("confirmPassword")}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              {accountForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {accountForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Dalej <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={workshopForm.handleSubmit(handleWorkshopSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="workshopName" className="text-slate-200">
                Nazwa warsztatu
              </Label>
              <Input
                id="workshopName"
                placeholder="Auto Serwis Kowalski"
                {...workshopForm.register("workshopName")}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              {workshopForm.formState.errors.workshopName && (
                <p className="text-xs text-destructive">
                  {workshopForm.formState.errors.workshopName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-200">
                Telefon <span className="text-slate-500">(opcjonalnie)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+48 123 456 789"
                {...workshopForm.register("phone")}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              {workshopForm.formState.errors.phone && (
                <p className="text-xs text-destructive">
                  {workshopForm.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-slate-200">
                Adres <span className="text-slate-500">(opcjonalnie)</span>
              </Label>
              <Input
                id="address"
                placeholder="ul. Mechaniczna 1, 00-000 Warszawa"
                {...workshopForm.register("address")}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stationCount" className="text-slate-200">
                Liczba stanowisk (1–5)
              </Label>
              <Input
                id="stationCount"
                type="number"
                min={1}
                max={5}
                {...workshopForm.register("stationCount")}
                className="bg-slate-700 border-slate-600 text-white"
              />
              {workshopForm.formState.errors.stationCount && (
                <p className="text-xs text-destructive">
                  {workshopForm.formState.errors.stationCount.message}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-slate-600 text-slate-200 hover:bg-slate-700"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Wstecz
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Rejestracja..." : "Zarejestruj"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>

      <CardFooter className="text-center text-sm text-slate-400">
        <p className="w-full">
          Masz już konto?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Zaloguj się
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
