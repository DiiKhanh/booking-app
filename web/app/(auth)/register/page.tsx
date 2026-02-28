"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.full_name.trim()) e.full_name = "Full name is required";
    if (!form.email.includes("@")) e.email = "Enter a valid email";
    if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (!/[A-Z]/.test(form.password)) e.password = "Must include an uppercase letter";
    if (!/[0-9]/.test(form.password)) e.password = "Must include a number";
    return e;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      await authService.register({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast.error(msg);
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-heading">Account created!</h2>
            <p className="text-muted-foreground text-sm">
              Your account has been created with <strong>guest</strong> access.
              To access the owner or admin portal, contact your platform administrator to upgrade your role.
            </p>
          </div>
          <Button className="w-full cursor-pointer" onClick={() => router.push("/login")}>
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-white translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white font-bold text-lg backdrop-blur-sm">
            SE
          </div>
          <span className="text-white font-bold text-xl font-heading">StayEase</span>
        </div>
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-bold text-white font-heading leading-tight">
            Join the StayEase platform
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-md">
            Create your account and start managing hotel properties, reservations,
            and revenue — all in one place.
          </p>
          <div className="space-y-3 pt-4">
            {[
              "Free to register",
              "Dedicated owner dashboard",
              "Real-time booking notifications",
              "Advanced revenue analytics",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
                <span className="text-white/80 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-white/40 text-xs">
          © 2026 StayEase. All rights reserved.
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              SE
            </div>
            <span className="font-bold font-heading">StayEase</span>
          </div>
          <div className="lg:ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="cursor-pointer">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-[400px] space-y-6 animate-in-up">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-heading text-foreground">
                Create your account
              </h2>
              <p className="text-muted-foreground text-sm">
                Fill in your details to get started
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className={cn("h-10", errors.full_name && "border-destructive")}
                />
                {errors.full_name && (
                  <p className="text-xs text-destructive">{errors.full_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className={cn("h-10", errors.email && "border-destructive")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className={cn("h-10 pr-10", errors.password && "border-destructive")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 890"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="h-10"
                />
              </div>

              <Button
                type="submit"
                className={cn("w-full h-10 gap-2 cursor-pointer transition-all duration-200", isLoading && "opacity-90")}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Creating account…</>
                ) : (
                  <>Create account<ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
