import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const heading = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const mono = DM_Sans({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StayEase — Hotel Management Portal",
    template: "%s | StayEase",
  },
  description:
    "Premium hotel management platform for owners and administrators. Manage properties, reservations, analytics, and more.",
  metadataBase: new URL("https://stayease.app"),
  openGraph: {
    type: "website",
    siteName: "StayEase",
    title: "StayEase — Hotel Management Portal",
    description:
      "Premium hotel management platform for owners and administrators.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${heading.variable} ${body.variable} ${mono.variable} font-sans antialiased min-h-screen`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
