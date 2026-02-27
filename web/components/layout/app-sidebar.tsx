"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, LogOut } from "lucide-react";
import type { NavItem } from "@/lib/nav-config";

interface AppSidebarProps {
  navItems: NavItem[];
  role: "owner" | "admin";
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function AppSidebar({ navItems, role, user }: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            SE
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-sidebar-primary truncate font-heading">
                StayEase
              </span>
              <span className="text-[10px] text-sidebar-foreground/60 capitalize">
                {role} Portal
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-2 py-1">
              Navigation
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (item.children?.length) {
                  return (
                    <Collapsible
                      key={item.href}
                      asChild
                      defaultOpen={isActive(item.href)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            isActive={isActive(item.href)}
                            className={cn(
                              "cursor-pointer transition-colors duration-150",
                              isActive(item.href) &&
                                "bg-sidebar-accent text-sidebar-primary font-medium"
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((sub) => (
                              <SidebarMenuSubItem key={sub.href}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActive(sub.href)}
                                  className={cn(
                                    "cursor-pointer transition-colors duration-150",
                                    isActive(sub.href) &&
                                      "text-sidebar-primary font-medium"
                                  )}
                                >
                                  <Link href={sub.href}>
                                    <sub.icon className="h-3.5 w-3.5 shrink-0" />
                                    <span>{sub.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive(item.href)}
                      className={cn(
                        "cursor-pointer transition-colors duration-150",
                        isActive(item.href) &&
                          "bg-sidebar-accent text-sidebar-primary font-medium"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge className="bg-primary/10 text-primary text-xs font-semibold">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: User info */}
      {user && (
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent transition-colors duration-150 cursor-pointer group",
              isCollapsed && "justify-center"
            )}
          >
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-sidebar-foreground truncate">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-sidebar-foreground/50 truncate">
                    {user.email}
                  </span>
                </div>
                <LogOut className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40 group-hover:text-sidebar-foreground transition-colors" />
              </>
            )}
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
