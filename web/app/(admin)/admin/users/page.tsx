"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserCheck, Building2, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserTable } from "@/components/admin/user-table";
import { adminService } from "@/services/admin.service";
import type { User, UserRole } from "@/types/user.types";

// Mock data
const MOCK_USERS: User[] = [
  { id: "u1", name: "Nguyen Van A", email: "owner1@email.com", role: "owner", createdAt: "2024-01-15" },
  { id: "u2", name: "Tran Thi B", email: "owner2@email.com", role: "owner", createdAt: "2024-02-20" },
  { id: "u3", name: "Le Van C", email: "guest1@email.com", role: "guest", createdAt: "2024-03-10" },
  { id: "u4", name: "Pham Thi D", email: "guest2@email.com", role: "guest", createdAt: "2024-04-05" },
  { id: "u5", name: "Hoang Van E", email: "guest3@email.com", role: "guest", createdAt: "2024-05-12" },
  { id: "u6", name: "Nguyen Thi F", email: "admin2@email.com", role: "admin", createdAt: "2024-01-01" },
  { id: "u7", name: "Do Van G", email: "owner3@email.com", role: "owner", createdAt: "2024-06-01" },
  { id: "u8", name: "Vo Thi H", email: "guest4@email.com", role: "guest", createdAt: "2024-06-15" },
];

const SUMMARY_STATS = [
  { label: "Total Users", value: MOCK_USERS.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { label: "Hotel Owners", value: MOCK_USERS.filter((u) => u.role === "owner").length, icon: Building2, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { label: "Guests", value: MOCK_USERS.filter((u) => u.role === "guest").length, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { label: "Admins", value: MOCK_USERS.filter((u) => u.role === "admin").length, icon: Shield, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminService.getUsers(),
    placeholderData: {
      success: true,
      data: MOCK_USERS,
      error: null,
      meta: { total: MOCK_USERS.length, page: 1, limit: 20, totalPages: 1 },
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      adminService.updateUserRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const banMutation = useMutation({
    mutationFn: (id: string) => adminService.banUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const users = data?.data ?? MOCK_USERS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage platform users, roles, and access
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SUMMARY_STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="font-bold text-lg">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <UserTable
          users={users}
          onBan={(id) => banMutation.mutate(id)}
          onChangeRole={(id, role) => roleMutation.mutate({ id, role })}
        />
      )}
    </div>
  );
}
