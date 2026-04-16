import Link from "next/link";
import { ArrowRight, Building2, Github, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Mobile App", href: "#mobile" },
    { label: "Pricing", href: "#" },
  ],
  "For Owners": [
    { label: "Sign Up", href: "/register" },
    { label: "Dashboard", href: "/login" },
    { label: "Property Guide", href: "#" },
    { label: "API Docs", href: "#" },
  ],
  "For Admins": [
    { label: "Admin Portal", href: "/login" },
    { label: "Hotel Approvals", href: "/login" },
    { label: "System Health", href: "/login" },
    { label: "DLQ Manager", href: "/login" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ],
};

export function CtaFooter() {
  return (
    <>
      {/* CTA Section */}
      <section
        className="mx-4 sm:mx-6 lg:mx-8 mb-8 rounded-3xl overflow-hidden"
        aria-labelledby="cta-heading"
        style={{
          background:
            "linear-gradient(135deg, #1A3A6B 0%, #0D2248 50%, #060C1A 100%)",
        }}
      >
        <div className="relative px-8 py-16 sm:py-20 text-center overflow-hidden">
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
            aria-hidden="true"
          />

          {/* Glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(255,87,51,0.2) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
            <h2
              id="cta-heading"
              className="font-heading text-3xl sm:text-4xl font-bold text-white leading-tight"
            >
              Ready to transform your{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #FF5733 0%, #FF8C69 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                hotel management?
              </span>
            </h2>
            <p className="text-white/60 text-lg">
              Join 2,400+ hotels already using StayEase. Set up in minutes,
              scale without limits.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                asChild
                className="h-12 px-8 text-base font-semibold gap-2 bg-accent hover:bg-accent/90 text-white cursor-pointer"
                style={{ boxShadow: "0 8px 32px rgba(255,87,51,0.30)" }}
              >
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 px-8 text-base bg-transparent border-white/30 text-white hover:bg-white/10 hover:border-white/50 cursor-pointer"
              >
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <p className="text-xs text-white/35">
              No credit card required · Free plan available · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 pb-8" aria-label="Site footer">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-border/60 bg-card px-8 py-10">
            {/* Top row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
              {/* Brand */}
              <div className="col-span-2 md:col-span-1 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <span className="font-heading font-bold text-lg text-foreground">
                    StayEase
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                  The complete hotel management platform for owners and
                  administrators.
                </p>
                <div className="flex gap-2">
                  <a
                    href="#"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors duration-150 cursor-pointer"
                    aria-label="GitHub"
                  >
                    <Github className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </a>
                  <a
                    href="#"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors duration-150 cursor-pointer"
                    aria-label="Contact email"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </a>
                </div>
              </div>

              {/* Link columns */}
              {Object.entries(FOOTER_LINKS).map(([category, links]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-xs font-semibold text-foreground font-heading uppercase tracking-wider">
                    {category}
                  </h3>
                  <ul className="space-y-2">
                    {links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Bottom bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 pt-6">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} StayEase. All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  All systems operational
                </span>
                <span>Go · Next.js · Expo</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
