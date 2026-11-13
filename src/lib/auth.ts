import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { UserRole, STAFF_ROLES } from "./types";

// Export role helpers for other modules
export { STAFF_ROLES };

/**
 * Get the currently signed‑in user via Clerk.
 * The user's role is expected to be stored in `publicMetadata.role`.
 * If the role is missing we default to "CUSTOMER".
 */
export async function getCurrentUser() {
  const { userId } = auth();
  if (!userId) return null;

  const user = await clerkClient.users.getUser(userId);
  const email = user.emailAddresses?.[0]?.emailAddress ?? "";
  const role = (user.publicMetadata?.role as UserRole) ?? ("CUSTOMER" as UserRole);

  // Return a minimal shape compatible with existing code expectations
  return {
    id: user.id,
    email,
    fullName: user.fullName ?? "",
    role,
    avatarUrl: user.imageUrl ?? null,
    // The following fields are not needed for role‑based checks, but keep placeholders
    addresses: [] as any[],
    riderProfile: null,
    vendorStaff: [],
  };
}

export function isStaffRole(role: string): boolean {
  return STAFF_ROLES.includes(role as UserRole);
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Please sign in");
  }
  return user;
}

export async function requireStaff() {
  const user = await requireAuth();
  if (!isStaffRole(user.role)) {
    throw new Error("Forbidden: Staff-only area. Access is restricted to internal operations personnel.");
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role as UserRole)) {
    throw new Error(`Forbidden: Access requires one of [${allowedRoles.join(", ")}]`);
  }
  return user;
}

