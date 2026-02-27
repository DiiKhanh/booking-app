"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { ownerNav } from "@/lib/nav-config";

const mockUser = {
  name: "Nguyen Van A",
  email: "owner@stayease.app",
};

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar navItems={ownerNav} role="owner" user={mockUser} />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header title="Dashboard" />
        <main className="flex-1 p-6 page-enter">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
