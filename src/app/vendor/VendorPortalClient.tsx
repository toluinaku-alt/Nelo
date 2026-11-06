"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  Bike,
  PackageCheck,
  DollarSign,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Receipt,
  Utensils,
  ChefHat,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { vendorUpdateOrderStatusAction } from "@/lib/actions";

interface CatalogItem {
  id: string;
  name: string;
  priceKobo: number;
  isAvailable: boolean;
  categoryName: string;
}

interface VendorOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  totalAmountKobo: number;
  subtotalKobo: number;
  customerName: string;
  customerPhone?: string | null;
  items: {
    id: string;
    nameSnapshot: string;
    quantity: number;
    priceKoboSnapshot: number;
  }[];
  marketplaceDetails?: {
    vendorInstructions: string | null;
    cutleryIncluded: boolean;
  } | null;
}

interface VendorPortalProps {
  vendor: {
    id: string;
    name: string;
    category: string;
    streetAddress: string;
    city: string;
    isAcceptingOrders: boolean;
    prepTimeMinutes: number;
    payoutBankName: string | null;
    payoutAccountNumber: string | null;
  };
  orders: VendorOrder[];
  catalogItems: CatalogItem[];
}

export function VendorPortalClient({
  vendor,
  orders,
  catalogItems: initialCatalogItems,
}: VendorPortalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"incoming" | "kitchen" | "catalog" | "payouts">("incoming");
  const [items, setItems] = useState<CatalogItem[]>(initialCatalogItems);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter orders by tab
  const incomingOrders = orders.filter((o) => o.status === "PLACED");
  const kitchenOrders = orders.filter((o) =>
    ["VENDOR_ACCEPTED", "AWAITING_RIDER", "ASSIGNED"].includes(o.status)
  );
  const completedOrders = orders.filter((o) =>
    ["PICKED_UP", "IN_TRANSIT", "DELIVERED"].includes(o.status)
  );

  const totalSalesKobo = orders
    .filter((o) => o.status !== "CANCELLED" && o.status !== "DECLINED")
    .reduce((sum, o) => sum + o.subtotalKobo, 0);

  const handleUpdateStatus = (
    orderId: string,
    status: "VENDOR_ACCEPTED" | "DECLINED" | "AWAITING_RIDER"
  ) => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await vendorUpdateOrderStatusAction(orderId, status);
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to update order status.");
      }
    });
  };

  const toggleItemAvailability = (itemId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isAvailable: !i.isAvailable } : i))
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Vendor Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-md">
            <Store className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {vendor.name}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
                {vendor.category}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {vendor.streetAddress}, {vendor.city} • Prep time: ~{vendor.prepTimeMinutes} mins
            </p>
          </div>
        </div>

        {/* Live Store Stats */}
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Vendor Revenue
            </span>
            <span className="text-xl font-extrabold text-slate-900">
              ₦{(totalSalesKobo / 100).toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">
              Store Status
            </span>
            <span className="text-sm font-extrabold text-emerald-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              Accepting Orders
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("incoming")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "incoming"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>Incoming Orders</span>
          {incomingOrders.length > 0 && (
            <span className="h-5 px-1.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
              {incomingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("kitchen")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "kitchen"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ChefHat className="h-3.5 w-3.5" />
          <span>Active Prep / Ready ({kitchenOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("catalog")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "catalog"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Utensils className="h-3.5 w-3.5" />
          <span>Menu Catalog ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("payouts")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "payouts"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          <span>Payout History</span>
        </button>
      </div>

      {/* Tab 1: Incoming Orders */}
      {activeTab === "incoming" && (
        <div className="space-y-4">
          {incomingOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <ChefHat className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                No New Orders Waiting
              </h3>
              <p className="text-xs text-slate-500">
                Incoming orders from hungry customers will ring here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-md space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="font-mono text-sm font-extrabold text-slate-900">
                        {order.orderNumber}
                      </span>
                      <p className="text-xs text-slate-500">
                        Customer: <strong>{order.customerName}</strong>
                      </p>
                    </div>
                    <span className="text-base font-black text-purple-700">
                      ₦{(order.subtotalKobo / 100).toLocaleString()}
                    </span>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 text-xs">
                    <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Items Ordered:
                    </p>
                    <div className="divide-y divide-slate-100">
                      {order.items.map((i) => (
                        <div key={i.id} className="py-1.5 flex justify-between">
                          <span className="font-semibold text-slate-800">
                            {i.quantity}x {i.nameSnapshot}
                          </span>
                          <span className="text-slate-600">
                            ₦{((i.priceKoboSnapshot * i.quantity) / 100).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.marketplaceDetails?.vendorInstructions && (
                      <div className="p-2.5 rounded-lg bg-amber-50 text-amber-900 text-[11px] font-medium">
                        <strong>Kitchen Note:</strong> {order.marketplaceDetails.vendorInstructions}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={() => handleUpdateStatus(order.id, "DECLINED")}
                      disabled={isPending}
                      className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(order.id, "VENDOR_ACCEPTED")}
                      disabled={isPending}
                      className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow disabled:opacity-50"
                    >
                      Accept & Cook
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Kitchen / Prep Orders */}
      {activeTab === "kitchen" && (
        <div className="space-y-4">
          {kitchenOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <PackageCheck className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                No Orders Currently In Prep
              </h3>
              <p className="text-xs text-slate-500">
                Orders accepted from the incoming queue will be prepared here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kitchenOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="font-mono text-sm font-extrabold text-slate-900">
                        {order.orderNumber}
                      </span>
                      <div className="mt-1">
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                    <span className="text-base font-black text-slate-900">
                      ₦{(order.subtotalKobo / 100).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {order.items.map((i) => (
                      <div key={i.id} className="flex justify-between text-slate-700">
                        <span>
                          {i.quantity}x {i.nameSnapshot}
                        </span>
                        <span>₦{((i.priceKoboSnapshot * i.quantity) / 100).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    {order.status === "VENDOR_ACCEPTED" ? (
                      <button
                        onClick={() => handleUpdateStatus(order.id, "AWAITING_RIDER")}
                        disabled={isPending}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow"
                      >
                        <Bike className="h-4 w-4" />
                        Food Ready — Dispatch Rider Pickup
                      </button>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 text-center text-xs font-semibold text-slate-600">
                        Rider Assigned • Waiting for Rider Handoff
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Menu Catalog Management */}
      {activeTab === "catalog" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Menu Items & Instant Stock Availability
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Toggle items off when ingredients run out to prevent customer cancellations.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between text-sm"
              >
                <div>
                  <h4 className="font-bold text-slate-900">{item.name}</h4>
                  <p className="text-xs text-slate-500">
                    Category: {item.categoryName} • ₦{(item.priceKobo / 100).toLocaleString()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleItemAvailability(item.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    item.isAvailable
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  {item.isAvailable ? (
                    <>
                      <ToggleRight className="h-4 w-4 text-emerald-600" />
                      In Stock
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4 text-slate-400" />
                      Sold Out
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Payout History */}
      {activeTab === "payouts" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Vendor Payout Ledger & Settlement
              </h3>
              <p className="text-xs text-slate-500">
                Settled to verified Nigerian bank account via automated Paystack transfers.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs">
              <span className="font-bold block">Designated Settlement Account:</span>
              <span>{vendor.payoutBankName || "Zenith Bank PLC"} • {vendor.payoutAccountNumber || "1019283746"}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Completed Order Settlements
            </h4>
            {completedOrders.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No completed orders yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {completedOrders.map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{o.orderNumber}</span>
                      <p className="text-slate-500 mt-0.5">
                        {new Date(o.createdAt).toLocaleDateString("en-NG")} • Status: {o.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-emerald-700 block">
                        +₦{(o.subtotalKobo / 100).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Credited to Vendor Payable
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
