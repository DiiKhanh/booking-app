import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  BarChart3,
  MessageSquare,
  Settings,
  Users,
  BookOpen,
  Activity,
  Server,
  FileText,
  AlertTriangle,
  Flag,
  ShieldCheck,
  Megaphone,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
};

export const ownerNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/owner/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Properties",
    href: "/owner/properties",
    icon: Building2,
  },
  {
    title: "Reservations",
    href: "/owner/reservations",
    icon: CalendarDays,
    badge: "5",
  },
  {
    title: "Analytics",
    href: "/owner/analytics",
    icon: BarChart3,
  },
  {
    title: "Messages",
    href: "/owner/messages",
    icon: MessageSquare,
    badge: "2",
  },
  {
    title: "Settings",
    href: "/owner/settings",
    icon: Settings,
  },
];

export const adminNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Hotels",
    href: "/admin/hotels",
    icon: Building2,
    badge: "12",
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Bookings",
    href: "/admin/bookings",
    icon: BookOpen,
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "System",
    href: "/admin/system",
    icon: Server,
    children: [
      { title: "Health", href: "/admin/system", icon: Activity },
      { title: "Logs", href: "/admin/system/logs", icon: FileText },
      { title: "DLQ", href: "/admin/system/dlq", icon: AlertTriangle },
    ],
  },
  {
    title: "Support",
    href: "/admin/messages",
    icon: MessageSquare,
    children: [
      { title: "Messages", href: "/admin/messages", icon: MessageSquare },
      { title: "Broadcast", href: "/admin/broadcast", icon: Megaphone },
    ],
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    children: [
      { title: "General", href: "/admin/settings", icon: Settings },
      { title: "Feature Flags", href: "/admin/settings/flags", icon: Flag },
      {
        title: "Security",
        href: "/admin/settings/security",
        icon: ShieldCheck,
      },
    ],
  },
];
