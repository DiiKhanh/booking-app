import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  MessageSquare,
  Bell,
  Shield,
  Users,
  Activity,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
  wide?: boolean;
}

const OWNER_FEATURES: Feature[] = [
  {
    icon: Building2,
    title: "Property Management",
    desc: "Create and manage multiple hotel properties. Configure photos, amenities, room types, and policies from a single dashboard.",
  },
  {
    icon: CalendarDays,
    title: "Smart Inventory",
    desc: "Set room availability and dynamic pricing in real-time. Distributed locking prevents double bookings under concurrent demand.",
  },
  {
    icon: BarChart3,
    title: "Revenue Analytics",
    desc: "Track occupancy rates, ADR trends, and revenue with Recharts dashboards. Identify peak periods and optimize your pricing strategy.",
    wide: true,
  },
  {
    icon: CheckCircle2,
    title: "Reservation Management",
    desc: "Full booking lifecycle: pending → confirmed → checked-in. View guest details, handle cancellations, and track payment status.",
    wide: true,
  },
  {
    icon: MessageSquare,
    title: "Guest Messaging",
    desc: "Real-time chat with guests via WebSocket. Resolve issues instantly — no email back-and-forth.",
  },
  {
    icon: Bell,
    title: "Instant Notifications",
    desc: "Push notifications for new bookings, cancellations, and messages. Never miss an important event.",
  },
];

const ADMIN_FEATURES: Feature[] = [
  {
    icon: Shield,
    title: "Hotel Approvals",
    desc: "Review new hotel registrations against a quality checklist. Approve or reject with notes — keep the platform quality high.",
  },
  {
    icon: Users,
    title: "User Management",
    desc: "Manage owners and guests. Assign roles, suspend accounts, and view full activity history with audit trails.",
  },
  {
    icon: Activity,
    title: "System Health",
    desc: "Monitor all microservices in real-time. View Dead Letter Queue messages, system logs, and platform-wide metrics.",
  },
];

function FeatureCard({ icon: Icon, title, desc, wide }: Feature) {
  return (
    <div
      className={`group relative rounded-2xl border border-border/60 bg-card p-6 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-200 cursor-default ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors duration-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-1.5 min-w-0">
          <h3 className="font-heading font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function AdminFeatureCard({ icon: Icon, title, desc }: Feature) {
  return (
    <div className="group relative rounded-2xl border border-border/60 bg-card p-6 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5 transition-all duration-200 cursor-default">
      <div className="space-y-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent/15 transition-colors duration-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-heading font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-24">
        {/* Owner features */}
        <div className="space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-medium text-primary">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              For Hotel Owners
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Everything you need to run{" "}
              <span className="brand-gradient">your hotel</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              From a single room to a hotel chain — manage it all from one
              intuitive dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {OWNER_FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>

        {/* Divider with tech callout */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center">
            <div className="bg-background px-6 py-2 rounded-full border border-border/60 text-xs text-muted-foreground flex items-center gap-6">
              <span>Distributed Lock</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>ES Geo-Search</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>Payment Saga</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>WebSocket Hub</span>
            </div>
          </div>
        </div>

        {/* Admin features */}
        <div className="space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1 text-xs font-medium text-accent">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              For Administrators
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Full platform{" "}
              <span className="brand-gradient">oversight & control</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Keep the platform healthy, fair, and performant with powerful
              admin tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ADMIN_FEATURES.map((feature) => (
              <AdminFeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
