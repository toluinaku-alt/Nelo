import { notFound } from "next/navigation";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderTrackingClient } from "./OrderTrackingClient";
import { ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Order Tracking — Nelo Nigeria",
  description: "Live delivery status and milestone timeline.",
};

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      vendor: true,
      shopForMeDetails: {
        include: { items: true },
      },
      packageDetails: true,
      items: true,
      delivery: {
        include: {
          rider: {
            include: { user: true },
          },
        },
      },
      events: {
        orderBy: { timestamp: "desc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Security & Audience Boundary:
  // A customer may ONLY access and track their own orders.
  // Internal staff members (DISPATCHER, ADMIN, SUPPORT, FINANCE) or assigned rider can also view.
  const isOwner = user && order.customerId === user.id;
  const isStaff = user && isStaffRole(user.role);
  const isAssignedRider =
    user?.role === "RIDER" && order.delivery?.rider?.userId === user.id;

  if (!isOwner && !isStaff && !isAssignedRider) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-red-200 text-center shadow-lg space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          For security and privacy reasons, customers can only view their own delivery orders. 
          This order belongs to another account.
        </p>
        <div className="pt-2">
          <a
            href="/orders"
            className="inline-block px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            Return to My Orders
          </a>
        </div>
      </div>
    );
  }

  return (
    <OrderTrackingClient
      order={{
        ...order,
        createdAt: order.createdAt.toISOString(),
        events: order.events.map((e: any) => ({
          ...e,
          createdAt: e.timestamp.toISOString(),
        })),
      }}
    />
  );
}
