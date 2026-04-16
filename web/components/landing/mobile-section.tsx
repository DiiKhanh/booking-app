import {
  Search,
  MapPin,
  CreditCard,
  CheckCircle2,
  Smartphone,
  Wifi,
} from "lucide-react";

const GUEST_FEATURES = [
  {
    icon: Search,
    title: "Smart Search",
    desc: "Full-text + geo search powered by Elasticsearch",
  },
  {
    icon: MapPin,
    title: "Map Discovery",
    desc: "Find hotels near you with interactive map view",
  },
  {
    icon: CreditCard,
    title: "Instant Booking",
    desc: "Book and pay in under 2 minutes",
  },
  {
    icon: Wifi,
    title: "Real-time Updates",
    desc: "Live booking status via WebSocket connection",
  },
];

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-64 sm:w-72">
      {/* Phone frame */}
      <div
        className="relative rounded-[40px] border-2 border-white/20 overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(160deg, #1A3A6B 0%, #060C1A 100%)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        {/* Notch */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="h-6 w-24 rounded-full bg-black/60 backdrop-blur-sm" />
        </div>

        {/* Screen content */}
        <div className="px-5 pb-8 space-y-4">
          {/* Header */}
          <div className="space-y-0.5">
            <p className="text-white/50 text-xs">Good morning,</p>
            <p className="text-white font-heading font-semibold text-sm">
              Where to next?
            </p>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5">
            <Search className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />
            <span className="text-white/40 text-xs">Search hotels…</span>
          </div>

          {/* Hotel cards */}
          {["The Grand Palace", "Ocean Breeze Resort"].map((name, i) => (
            <div
              key={name}
              className="rounded-xl bg-white/10 overflow-hidden"
            >
              <div
                className="h-20 w-full"
                style={{
                  background:
                    i === 0
                      ? "linear-gradient(135deg, #1A3A6B 0%, #2D5A9E 100%)"
                      : "linear-gradient(135deg, #0D2248 0%, #1A3A6B 100%)",
                }}
              />
              <div className="p-2.5 flex items-start justify-between">
                <div>
                  <p className="text-white text-xs font-medium font-heading leading-tight">
                    {name}
                  </p>
                  <p className="text-white/50 text-xs flex items-center gap-1 mt-0.5">
                    <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                    Ho Chi Minh City
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white text-xs font-bold">$89</p>
                  <p className="text-white/40 text-[10px]">/night</p>
                </div>
              </div>
            </div>
          ))}

          {/* Book button */}
          <div
            className="rounded-xl py-3 text-center text-xs font-semibold text-white font-heading"
            style={{ background: "linear-gradient(135deg, #FF5733, #FF8C69)" }}
          >
            Book Now · Instant Confirm
          </div>
        </div>
      </div>

      {/* Floating status chip */}
      <div
        className="absolute -right-4 top-1/3 flex items-center gap-1.5 rounded-xl border border-white/20 bg-card/90 backdrop-blur-md px-3 py-2 shadow-xl"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-medium text-foreground whitespace-nowrap">
          Booking confirmed
        </span>
      </div>

      {/* Floating WS chip */}
      <div
        className="absolute -left-4 bottom-1/4 flex items-center gap-1.5 rounded-xl border border-white/20 bg-card/90 backdrop-blur-md px-3 py-2 shadow-xl"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
      >
        <Wifi className="h-3 w-3 text-primary" aria-hidden="true" />
        <span className="text-xs font-medium text-foreground whitespace-nowrap">
          Live updates
        </span>
      </div>
    </div>
  );
}

export function MobileSection() {
  return (
    <section
      id="mobile"
      className="py-24 px-4 sm:px-6"
      aria-labelledby="mobile-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div className="space-y-8 order-2 lg:order-1">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1 text-xs font-medium text-accent">
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                For Guests — iOS & Android
              </div>
              <h2
                id="mobile-heading"
                className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight"
              >
                Guests book on the{" "}
                <span className="brand-gradient">StayEase mobile app</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                While you manage from the web portal, your guests enjoy a
                beautiful mobile experience — from search to check-out,
                all in real-time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GUEST_FEATURES.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* App store badges */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-4 py-2.5 cursor-pointer hover:border-primary/40 transition-colors duration-150">
                <div className="h-8 w-8 rounded-lg bg-foreground/10 flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-foreground/60" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none">
                    Download on the
                  </p>
                  <p className="text-sm font-semibold font-heading text-foreground">
                    App Store
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-4 py-2.5 cursor-pointer hover:border-primary/40 transition-colors duration-150">
                <div className="h-8 w-8 rounded-lg bg-foreground/10 flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-foreground/60" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none">
                    Get it on
                  </p>
                  <p className="text-sm font-semibold font-heading text-foreground">
                    Google Play
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              Built with Expo SDK 54 · React Native · NativeWind
            </div>
          </div>

          {/* Right — phone mockup */}
          <div className="flex justify-center order-1 lg:order-2">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
