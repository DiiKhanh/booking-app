import Link from "next/link";
import { ArrowRight, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATS = [
  { value: "2,400+", label: "Hotels on Platform" },
  { value: "98%", label: "Uptime SLA" },
  { value: "50K+", label: "Bookings / Day" },
  { value: "4.9★", label: "Owner Rating" },
];

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-28 pb-20"
      style={{
        background:
          "linear-gradient(160deg, #1A3A6B 0%, #0D2248 45%, #060C1A 100%)",
      }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden="true"
      />

      {/* Glow orbs */}
      <div
        className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(26,58,107,0.5) 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,87,51,0.12) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm text-white/75">
          <Zap className="h-3.5 w-3.5 text-accent shrink-0" aria-hidden="true" />
          <span>Saga Pattern · Real-time WebSocket · AI-Ready</span>
        </div>

        {/* Headline */}
        <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
          Hotel Management,{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #FF5733 0%, #FF8C69 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Perfected.
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
          The complete platform for hotel owners and administrators. Manage
          properties, reservations, and analytics — powered by real-time
          updates and intelligent automation.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="lg"
            asChild
            className="h-12 px-8 text-base font-semibold gap-2 bg-accent hover:bg-accent/90 text-white shadow-lg cursor-pointer"
            style={{ boxShadow: "0 8px 32px rgba(255,87,51,0.30)" }}
          >
            <Link href="/register">
              Start Managing Free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="h-12 px-8 text-base bg-transparent border-white/30 text-white hover:bg-white/10 hover:border-white/50 cursor-pointer"
          >
            <Link href="/login">Sign in to Dashboard</Link>
          </Button>
        </div>

        {/* Trust badge */}
        <p className="text-xs text-white/35 flex items-center justify-center gap-1.5">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
          Trusted by 2,400+ hotels worldwide · No credit card required
        </p>
      </div>

      {/* Stats strip */}
      <div className="relative z-10 mt-16 w-full max-w-3xl mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl overflow-hidden border border-white/10">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`bg-white/5 backdrop-blur-sm p-5 sm:p-6 text-center ${
                i < STATS.length - 1 ? "border-r border-b sm:border-b-0 border-white/10" : ""
              }`}
            >
              <div className="font-heading text-2xl sm:text-3xl font-bold text-white">
                {stat.value}
              </div>
              <div className="text-xs text-white/45 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade into page bg */}
      <div
        className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, var(--background) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />
    </section>
  );
}
