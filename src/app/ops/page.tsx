import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OpsDashboardClient } from "./OpsDashboardClient";
import { ShieldAlert, Lock } from "lucide-react";

export const metadata = {
  title: "Central Operations — Nelo Internal Staff",
  description: "Staff-only dispatch board, fleet monitoring, and financial ledger review.",
};

export default async function OpsDashboardPage() {
  const user = await getCurrentUser();

  const isStaff = user ? isStaffRole(user.role) : false;

  // Strict Server-Side Security Boundary Check:
  // Customers, Vendors, and Riders CANNOT access internal operations
  if (!user || !isStaff) {
    return (
      <div className="max-w-lg mx-auto my-16 bg-white rounded-3xl p-8 border-2 border-red-200 shadow-2xl text-center space-y-5">
        <div className="h-16 w-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest bg-red-100 text-red-800 px-3 py-1 rounded-full border border-red-200">
            Internal Staff Boundary Enforced
          </span>
          <h2 className="text-2xl font-black text-slate-900">
            Access Denied (403 Forbidden)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            The Central Operations console is restricted strictly to authorized internal operations personnel (Dispatchers, Support Agents, Finance Operators, and Administrators).
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-800">Your Current Session:</p>
          <p>User: {user?.fullName || "Guest"}</p>
          <p>Role: <strong className="text-red-600">{user?.role || "ANONYMOUS"}</strong></p>
          <p className="text-[11px] text-slate-400 mt-1">
            To evaluate the staff console, switch to <strong>Folake Daniels (Dispatcher)</strong> or <strong>Ngozi Eze (Finance)</strong> using the top demo switcher.
          </p>
        </div>

        <div className="pt-2">
          <a
            href="/"
            className="inline-block px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            Return to Public Home
          </a>
        </div>
      </div>
    );
  }

  // Fetch all orders
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      zone: true,
      shopForMeDetails: {
        include: { items: true },
      },
      delivery: {
        include: {
          rider: {
            include: { user: true },
          },
        },
      },
    },
  });

  // Fetch riders
  const riders = await prisma.riderProfile.findMany({
    include: { user: true },
    orderBy: { totalDeliveries: "desc" },
  });

  // Fetch ledger accounts
  const ledgerAccounts = await prisma.ledgerAccount.findMany({
    orderBy: { code: "asc" },
  });

  // Fetch ledger entries
  const ledgerEntries = await prisma.ledgerEntry.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: {
      debitAccount: true,
      creditAccount: true,
    },
  });

  // Fetch audit logs
  const auditLogs = await prisma.auditLog.findMany({
    take: 30,
    orderBy: { timestamp: "desc" },
    include: {
      user: true,
    },
  });

  return (
    <OpsDashboardClient
      currentStaff={{
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
      }}
      orders={orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        serviceType: o.serviceType,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        totalAmountKobo: o.totalAmountKobo,
        subtotalKobo: o.subtotalKobo,
        deliveryFeeKobo: o.deliveryFeeKobo,
        serviceFeeKobo: o.serviceFeeKobo,
        customerName: o.customer.fullName,
        customerPhone: o.customer.phone,
        zoneName: o.zone?.name || "Calabar Municipal",
        shopForMeDetails: o.shopForMeDetails
          ? {
              ...o.shopForMeDetails,
              customerApprovedAt: o.shopForMeDetails.customerApprovedAt?.toISOString() || null,
              shopPaidAt: o.shopForMeDetails.shopPaidAt?.toISOString() || null,
              pickupReleasedAt: o.shopForMeDetails.pickupReleasedAt?.toISOString() || null,
            }
          : null,
        delivery: o.delivery
          ? {
              id: o.delivery.id,
              status: o.delivery.status,
              riderId: o.delivery.riderId,
              riderName: o.delivery.rider?.user.fullName || null,
              riderPlate: o.delivery.rider?.plateNumber || null,
            }
          : null,
      }))}
      riders={riders.map((r) => ({
        id: r.id,
        userId: r.userId,
        fullName: r.user.fullName,
        plateNumber: r.plateNumber,
        isOnline: r.isOnline,
        totalDeliveries: r.totalDeliveries,
        rating: r.rating,
        walletBalanceKobo: r.walletBalanceKobo,
      }))}
      ledgerAccounts={ledgerAccounts.map((la) => ({
        id: la.id,
        code: la.code,
        name: la.name,
        type: la.currency,
        balanceKobo: la.balanceKobo,
      }))}
      ledgerEntries={ledgerEntries.map((le) => ({
        id: le.id,
        orderNumber: le.orderId || "DIRECT",
        debitAccount: le.debitAccount.code,
        creditAccount: le.creditAccount.code,
        amountKobo: le.amountKobo,
        description: le.description,
        isCompensating: le.isCompensating,
        createdAt: le.createdAt.toISOString(),
      }))}
      auditLogs={auditLogs.map((al) => ({
        id: al.id,
        userName: al.user?.fullName || "Staff",
        userRole: al.userRole,
        action: al.action,
        targetResource: al.targetResource,
        targetId: al.targetId,
        reason: al.reason,
        createdAt: al.timestamp.toISOString(),
      }))}
    />
  );
}
