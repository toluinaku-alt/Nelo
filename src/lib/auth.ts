import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { UserRole, DEMO_USERS, STAFF_ROLES } from "./types";

export { DEMO_USERS, STAFF_ROLES };

export async function getCurrentUser() {
  const cookieStore = cookies();
  const activeEmail = cookieStore.get("nelo_active_user")?.value || "chioma@nelo.ng";

  const user = await prisma.user.findUnique({
    where: { email: activeEmail },
    include: {
      addresses: true,
      riderProfile: true,
      vendorStaff: {
        include: {
          vendor: true,
        },
      },
    },
  });

  if (!user) {
    // If not found in DB yet (e.g. before seeding), return mock matching demo user
    const demo = DEMO_USERS.find((u) => u.email === activeEmail) || DEMO_USERS[0];
    return {
      id: "mock-" + demo.role.toLowerCase(),
      email: demo.email,
      fullName: demo.name,
      phone: "+234 803 123 4567",
      role: demo.role,
      avatarUrl: null,
      isActive: true,
      addresses: [] as any[],
      riderProfile: demo.role === "RIDER" ? { id: "mock-rider-1", isOnline: true } : null,
      vendorStaff: demo.role === "VENDOR_OWNER" ? [{ vendorId: "mock-vendor-1" }] : [],
    };
  }

  return user;
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
