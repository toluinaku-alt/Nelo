import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { ServiceBadge } from "@/components/ServiceBadge";
import {
  ClipboardList,
  ArrowRight,
  Clock,
  MapPin,
  ShoppingBag,
  Package,
  Utensils,
  ChevronRight,
} from "lucide-react";

export const metadata = {
  title: "My Orders — Nelo Nigeria",
  description: "Track your active and past deliveries with Nelo.",
};

export default async function OrdersPage() {
  const user = await getCurrentUser();

  // Enforce customer boundary on the server
  const orders = await prisma.order.findMany({
    where: {
      customerId: user?.id,
    },
    orderBy: {
      createdAt: "desc",
    },
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
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Orders & Deliveries
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tracking customer deliveries for <strong className="text-slate-800">{user?.fullName || "Chioma Adeleke"}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-nelo-50 text-nelo-700 text-xs font-semibold hover:bg-nelo-100 transition"
          >
            <Utensils className="h-3.5 w-3.5" />
            Marketplace
          </Link>
          <Link
            href="/shop-for-me"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Shop for Me
          </Link>
          <Link
            href="/send-package"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition"
          >
            <Package className="h-3.5 w-3.5" />
            Courier
          </Link>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <ClipboardList className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Orders Placed Yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            You don't have any active or past deliveries on your account right now.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/marketplace"
              className="px-5 py-2.5 rounded-xl bg-nelo-600 hover:bg-nelo-700 text-white font-bold text-sm shadow transition"
            >
              Order Food & Groceries
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const formattedTotal = (order.totalAmountKobo / 100).toLocaleString("en-NG", {
              style: "currency",
              currency: "NGN",
              maximumFractionDigits: 0,
            });

            let serviceSummary = "";
            if (order.serviceType === "MARKETPLACE") {
              serviceSummary = `${order.vendor?.name || "Vendor Store"} • ${order.items.length} items`;
            } else if (order.serviceType === "SHOP_FOR_ME") {
              serviceSummary = `${order.shopForMeDetails?.shopName || "Personal Shopping"} • ${
                order.shopForMeDetails?.items.length || 0
              } items requested`;
            } else if (order.serviceType === "PACKAGE") {
              serviceSummary = `Courier to ${order.packageDetails?.recipientName || "Recipient"} (${
                order.packageDetails?.packageCategory || "Parcel"
              })`;
            }

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white rounded-2xl p-5 border border-slate-200 hover:border-nelo-500 hover:shadow-md transition group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {order.orderNumber}
                    </span>
                    <ServiceBadge serviceType={order.serviceType} />
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="text-right sm:text-right">
                    <span className="text-base font-extrabold text-slate-900">
                      {formattedTotal}
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm mb-0.5">
                      {serviceSummary}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(order.createdAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {order.delivery?.rider && (
                        <span className="text-slate-600 font-medium">
                          Rider: {order.delivery.rider.user.fullName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1 font-bold text-nelo-600 group-hover:translate-x-1 transition text-xs sm:self-center">
                    Track Delivery
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
