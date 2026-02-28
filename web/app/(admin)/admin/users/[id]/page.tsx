"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Shield,
  Building2,
  CalendarDays,
  UserX,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import type { User, UserRole } from "@/types/user.types";

const MOCK_USER: User & { banned?: boolean } = {
  id: "u3",
  name: "Le Van C",
  email: "levanc@example.com",
  role: "guest",
  phone: "+84 912 345 678",
  createdAt: "2024-03-10",
};

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ElementType; className: string }> = {
  admin: {
    label: "Admin",
    icon: Shield,
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  owner: {
    label: "Hotel Owner",
    icon: Building2,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  guest: {
    label: "Guest",
    icon: UserCheck,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

const MOCK_ACTIVITY = [
  { label: "Booking #B-4821", desc: "Checked in to Grand Palace Hotel", date: "2026-02-28", icon: CalendarDays },
  { label: "Booking #B-4103", desc: "Completed stay at Sunrise Beach Resort", date: "2026-01-15", icon: CalendarDays },
  { label: "Review submitted", desc: "Left 5-star review for Grand Palace", date: "2026-01-20", icon: ShieldCheck },
  { label: "Account created", desc: "Registered on the platform", date: "2024-03-10", icon: UserCheck },
];

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => adminService.getUser(id),
    placeholderData: { success: true, data: MOCK_USER, error: null },
  });

  const roleMutation = useMutation({
    mutationFn: (role: UserRole) => adminService.updateUserRole(id, role),
    onSuccess: (_, role) => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`Role updated to ${ROLE_CONFIG[role].label}`);
    },
    onError: () => toast.error("Failed to update role"),
  });

  const banMutation = useMutation({
    mutationFn: () => adminService.banUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      toast.success("User banned successfully");
    },
    onError: () => toast.error("Failed to ban user"),
  });

  const unbanMutation = useMutation({
    mutationFn: () => adminService.unbanUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      toast.success("User unbanned");
    },
    onError: () => toast.error("Failed to unban user"),
  });

  const user = (data?.data ?? MOCK_USER) as User & { banned?: boolean };
  const roleCfg = ROLE_CONFIG[user.role];
  const RoleIcon = roleCfg.icon;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Member since {format(new Date(user.createdAt), "MMMM yyyy")}
            </p>
          </div>
        </div>

        {user.banned ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => unbanMutation.mutate()}
            disabled={unbanMutation.isPending}
            className="cursor-pointer"
          >
            <UserCheck className="h-4 w-4 mr-1.5" />
            Unban User
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/10 cursor-pointer">
                <UserX className="h-4 w-4 mr-1.5" />
                Ban User
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ban {user.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This user will lose access to the platform immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => banMutation.mutate()}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Ban User
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <Avatar className="h-20 w-20 mx-auto">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{user.name}</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium mt-1 ${roleCfg.className}`}>
                  <RoleIcon className="h-3 w-3" />
                  {roleCfg.label}
                </span>
              </div>

              <Separator />

              <div className="space-y-2.5 text-sm text-left">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Joined {format(new Date(user.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role management */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Role Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Current role</p>
                <Select
                  value={user.role}
                  onValueChange={(v) => roleMutation.mutate(v as UserRole)}
                  disabled={roleMutation.isPending}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="owner">Hotel Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Changing roles takes effect immediately.
              </p>
            </CardContent>
          </Card>

          {/* Account status */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Account Status</span>
                <Badge variant={user.banned ? "destructive" : "default"} className="capitalize">
                  {user.banned ? "Banned" : "Active"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs">{user.id}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity timeline */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Total Bookings", value: "12" },
                  { label: "Completed Stays", value: "10" },
                  { label: "Total Spent", value: "$2,840" },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 rounded-lg bg-muted/40 border border-border/60">
                    <p className="text-xl font-bold font-heading">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Activity History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {MOCK_ACTIVITY.map((event, i) => {
                  const Icon = event.icon;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        {i < MOCK_ACTIVITY.length - 1 && (
                          <div className="w-px h-8 bg-border my-0.5" />
                        )}
                      </div>
                      <div className="pb-4 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{event.label}</p>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {format(new Date(event.date), "MMM d, yyyy")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{event.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
