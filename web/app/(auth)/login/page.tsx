"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

function redirectByRole(role: string, router: ReturnType<typeof useRouter>) {
  if (role === "admin") router.push("/admin/dashboard");
  else if (role === "owner") router.push("/owner/dashboard");
  else router.push("/login?error=portal_access");
}

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", remember: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
      const { user, tokens } = await authService.login({
        email: form.email,
        password: form.password,
      });
      setUser(user);
      setTokens(tokens);
      if (user.role === "guest") {
        toast.error("This portal is for hotel owners and admins. Use the mobile app to book hotels.");
        setIsLoading(false);
        return;
      }
      toast.success(`Welcome back, ${user.name}!`);
      redirectByRole(user.role, router);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Invalid email or password";
      toast.error(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-white translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white font-bold text-lg backdrop-blur-sm">
            SE
          </div>
          <span className="text-white font-bold text-xl font-heading">StayEase</span>
        </div>
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white font-heading leading-tight">
              Manage your hotel business with ease
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-md">
              Powerful tools for hotel owners and administrators to manage
              properties, reservations, and analytics in one place.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "📊", label: "Real-time Analytics" },
              { icon: "📅", label: "Smart Inventory" },
              { icon: "🔔", label: "Instant Notifications" },
              { icon: "💬", label: "Guest Messaging" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm"
              >
                <span className="text-base" role="img" aria-hidden>{f.icon}</span>
                <span className="text-white/90 text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { value: "2,400+", label: "Hotels" },
            { value: "98%", label: "Uptime" },
            { value: "50K+", label: "Bookings/day" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold text-white font-heading">{s.value}</div>
              <div className="text-white/60 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
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
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-[400px] space-y-8 animate-in-up">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-heading text-foreground">
                Welcome back
              </h2>
              <p className="text-muted-foreground text-sm">
                Sign in to your management portal
              </p>
            </div>

            {/* Demo credentials */}
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Demo credentials:</p>
              <p>Owner: <code className="text-primary">owner@stayease.app</code></p>
              <p>Admin: <code className="text-primary">admin@stayease.app</code></p>
              <p>Password: <code className="text-primary">Password123</code></p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@stayease.app"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="h-10 pr-10"
                    required
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
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={form.remember}
                  onCheckedChange={(v) => setForm((prev) => ({ ...prev, remember: Boolean(v) }))}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  Remember me for 30 days
                </Label>
              </div>

              <Button
                type="submit"
                className={cn("w-full h-10 gap-2 cursor-pointer transition-all duration-200", isLoading && "opacity-90")}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</>
                ) : (
                  <>Sign in<ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:underline">Terms</Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
