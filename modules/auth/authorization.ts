import { UserService } from "@/modules/users/service";

export async function requireAuth() {
  const user = await UserService.getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function hasPermission(role: string, requiredRole: string) {
  // Simple check for now, can be expanded to a full RBAC matrix
  const matrix: Record<string, string[]> = {
    admin: ["admin", "user"],
    user: ["user"],
  };
  
  return matrix[role]?.includes(requiredRole) ?? false;
}
