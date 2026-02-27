"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { adminNav } from "@/lib/nav-config";

const mockUser = {
  name: "Admin User",
  email: "admin@stayease.app",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar navItems={adminNav} role="admin" user={mockUser} />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header title="Admin Dashboard" />
        <main className="flex-1 p-6 page-enter">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
