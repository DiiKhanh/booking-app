import { Building2, Settings2, Rocket, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: Building2,
    title: "Register Your Property",
    desc: "Sign up as a hotel owner, add your property details, photos, and amenities. Our admin team reviews and approves your listing within 24 hours.",
    detail: "Approval workflow included",
  },
  {
    step: "02",
    icon: Settings2,
    title: "Configure Rooms & Rates",
    desc: "Set up your room types, inventory, and dynamic pricing. Our real-time inventory system prevents overbooking with distributed locks.",
    detail: "Distributed locking built-in",
  },
  {
    step: "03",
    icon: Rocket,
    title: "Go Live & Accept Bookings",
    desc: "Your hotel is discoverable on the StayEase mobile app. Guests can search, book, and pay in minutes. You get notified instantly.",
    detail: "Real-time WebSocket updates",
  },
];

const TRUST_ITEMS = [
  "No double bookings — ever",
  "Payments processed with Saga pattern",
  "Real-time status via WebSocket",
  "99.9% uptime guarantee",
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-24 px-4 sm:px-6 bg-muted/30"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl space-y-16">
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2
            id="how-it-works-heading"
            className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight"
          >
            Up and running in{" "}
            <span className="brand-gradient">3 simple steps</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            From registration to your first booking in less than a day.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line — desktop only */}
          <div
            className="hidden md:block absolute top-16 left-[calc(16.67%+32px)] right-[calc(16.67%+32px)] h-px border-t border-dashed border-border"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(({ step, icon: Icon, title, desc, detail }) => (
              <div key={step} className="relative flex flex-col items-center text-center space-y-4">
                {/* Step circle */}
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white text-xs font-bold font-heading">
                    {step.slice(1)}
                  </span>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="font-heading font-semibold text-lg text-foreground">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    {desc}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust bar */}
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {TRUST_ITEMS.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
