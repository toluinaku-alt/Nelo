"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  MapPin,
  Bike,
  ShieldCheck,
  CheckCircle2,
  Circle,
  Phone,
  User,
  ShoppingBag,
  Package,
  Utensils,
  ChevronLeft,
  KeyRound,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ServiceBadge } from "@/components/ServiceBadge";
import { MapMock } from "@/components/MapMock";

interface OrderTrackingProps {
  order: {
    id: string;
    orderNumber: string;
    serviceType: string;
    status: string;
    createdAt: string;
    subtotalKobo: number;
    deliveryFeeKobo: number;
    serviceFeeKobo: number;
    totalAmountKobo: number;
    pickupAddressJson: string;
    dropoffAddressJson: string;
    cancellationReason: string | null;
    vendor?: {
      name: string;
      streetAddress: string;
      city: string;
    } | null;
    items?: {
      id: string;
      nameSnapshot: string;
      priceKoboSnapshot: number;
      quantity: number;
    }[];
    shopForMeDetails?: {
      shopName: string;
      shopAddress: string;
      goodsBudgetKobo: number;
      spendingLimitKobo: number;
      substitutionPreference: string;
      actualGoodsSpentKobo: number | null;
      reconciliationStatus: string;
      items: {
        id: string;
        itemName: string;
        quantity: number;
        unit: string | null;
        notes: string | null;
        isPurchased: boolean;
      }[];
    } | null;
    packageDetails?: {
      packageCategory: string;
      weightKg: number;
      dimensionsCm: string | null;
      recipientName: string;
      recipientPhone: string;
      securityPin: string | null;
      isFragile: boolean;
      deliveryInstructions: string | null;
    } | null;
    delivery?: {
      id: string;
      status: string;
      distanceKm: number;
      estimatedDurationMinutes: number;
      riderCoordinatesJson?: string | null;
      rider?: {
        plateNumber: string | null;
        user: {
          fullName: string;
          phone: string | null;
        };
      } | null;
    } | null;
    events: {
      id: string;
      eventType: string;
      actorRole: string;
      createdAt: string;
    }[];
  };
}

const LIFECYCLE_STEPS = [
  { key: "PLACED", label: "Order Placed" },
  { key: "AWAITING_RIDER", label: "Searching Rider" },
  { key: "ASSIGNED", label: "Rider Assigned" },
  { key: "PICKED_UP", label: "Picked Up" },
  { key: "IN_TRANSIT", label: "In Transit" },
  { key: "DELIVERED", label: "Delivered" },
];

export function OrderTrackingClient({ order }: OrderTrackingProps) {
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Parse addresses
  let pickup = { name: "Pickup Location", address: "Pickup Address", latitude: 6.4474, longitude: 3.4735 };
  let dropoff = { name: "Delivery Destination", address: "Delivery Address", latitude: 6.4281, longitude: 3.4219 };

  try {
    pickup = JSON.parse(order.pickupAddressJson);
  } catch (e) {}
  try {
    dropoff = JSON.parse(order.dropoffAddressJson);
  } catch (e) {}

  const currentStepIndex = (() => {
    switch (order.status) {
      case "PLACED":
      case "VENDOR_ACCEPTED":
        return 0;
      case "AWAITING_RIDER":
        return 1;
      case "ASSIGNED":
      case "ARRIVED_PICKUP":
        return 2;
      case "PICKED_UP":
        return 3;
      case "IN_TRANSIT":
        return 4;
      case "DELIVERED":
        return 5;
      default:
        return 1;
    }
  })();

  const isTerminalFailure = ["CANCELLED", "DECLINED", "REFUNDED", "PAYMENT_FAILED"].includes(
    order.status
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to My Orders
        </Link>

        <button
          onClick={() => setShowSupportModal(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition shadow-sm"
        >
          <HelpCircle className="h-3.5 w-3.5 text-nelo-600" />
          Need Help?
        </button>
      </div>

      {/* Main Order Status Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-base font-extrabold text-slate-900">
                {order.orderNumber}
              </span>
              <ServiceBadge serviceType={order.serviceType} />
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-slate-500">
              Placed on {new Date(order.createdAt).toLocaleString("en-NG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 block font-medium uppercase">
              Total Authorized
            </span>
            <span className="text-2xl font-black text-slate-900">
              {(order.totalAmountKobo / 100).toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
        </div>

        {/* Lifecycle Stepper */}
        {!isTerminalFailure ? (
          <div className="py-2">
            <div className="grid grid-cols-6 gap-1 relative">
              {LIFECYCLE_STEPS.map((step, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition shadow-sm mb-1.5 ${
                        isCurrent
                          ? "bg-nelo-600 text-white ring-4 ring-nelo-100"
                          : isPassed
                          ? "bg-nelo-600 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs leading-tight ${
                        isCurrent
                          ? "font-extrabold text-nelo-700"
                          : isPassed
                          ? "font-semibold text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Order Not Completed</p>
              <p className="text-xs mt-0.5">
                Status: {order.status}. {order.cancellationReason && `Reason: ${order.cancellationReason}`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Package Courier: Delivery PIN Card */}
      {order.packageDetails?.securityPin && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-200 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              <KeyRound className="h-3.5 w-3.5" />
              Recipient Handoff Security PIN
            </div>
            <h3 className="text-lg font-bold">
              Give this 4-digit code to {order.packageDetails.recipientName}
            </h3>
            <p className="text-xs text-blue-200 max-w-md">
              The rider must submit this matching PIN on their mobile terminal to complete the delivery and release payment.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-8 py-4 text-center">
            <span className="block text-[10px] uppercase font-bold text-blue-200 tracking-widest">
              Verification PIN
            </span>
            <span className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-amber-400">
              {order.packageDetails.securityPin}
            </span>
          </div>
        </div>
      )}

      {/* Live Map & Rider Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-nelo-600" />
                Live Delivery Route
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                {order.delivery?.distanceKm || 6.5} km • Est. {order.delivery?.estimatedDurationMinutes || 30} mins
              </span>
            </div>

            <MapMock
              pickup={pickup}
              dropoff={dropoff}
              riderCoordinates={
                order.delivery?.rider
                  ? { latitude: 6.4385, longitude: 3.4478 }
                  : undefined
              }
              status={order.status}
            />

            {/* Address Stop Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Pickup Point
                </span>
                <p className="font-bold text-slate-800">{pickup.name || "Vendor / Market"}</p>
                <p className="text-slate-500 text-[11px]">{pickup.address || "Location specified"}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Drop-off Destination
                </span>
                <p className="font-bold text-slate-800">{dropoff.name || "Customer Destination"}</p>
                <p className="text-slate-500 text-[11px]">{dropoff.address || "Street address"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rider Profile Card & Service Specific Details */}
        <div className="space-y-6">
          {/* Rider Assigned Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Assigned Nelo Rider
            </h3>

            {order.delivery?.rider ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-800 font-black text-lg flex items-center justify-center shadow-inner">
                    <Bike className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {order.delivery.rider.user.fullName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Plate: <span className="font-mono font-semibold text-slate-700">{order.delivery.rider.plateNumber || "LAGOS-KJA-882"}</span>
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      Verified Rider • ⭐ 4.9
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={`tel:${order.delivery.rider.user.phone || "+2348030000000"}`}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Phone className="h-3.5 w-3.5 text-nelo-600" />
                    Call Rider ({order.delivery.rider.user.phone || "+234 803 000 0000"})
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2">
                <Bike className="h-6 w-6 text-slate-400 mx-auto animate-bounce" />
                <p className="text-xs font-semibold text-slate-700">
                  Matching with nearby riders...
                </p>
                <p className="text-[11px] text-slate-500">
                  Offers dispatched across the local Nigerian delivery zone.
                </p>
              </div>
            )}
          </div>

          {/* Payment & Ledger Transparency */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Payment & Fare Breakdown
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Items / Budget Subtotal:</span>
                <span className="font-semibold text-slate-900">
                  ₦{(order.subtotalKobo / 100).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Logistics Fee:</span>
                <span className="font-semibold text-slate-900">
                  ₦{(order.deliveryFeeKobo / 100).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Platform / Concierge Fee:</span>
                <span className="font-semibold text-slate-900">
                  ₦{(order.serviceFeeKobo / 100).toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-extrabold text-slate-900">
                <span>Total Authorization:</span>
                <span className="text-nelo-700">
                  ₦{(order.totalAmountKobo / 100).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <ShieldCheck className="h-3 w-3" />
                Paid via Mock Paystack Sandbox
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Service-Specific Content */}
      {order.serviceType === "MARKETPLACE" && order.items && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Utensils className="h-4 w-4 text-emerald-600" />
            Ordered Items ({order.items.length})
          </h3>
          <div className="divide-y divide-slate-100 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">
                    {item.quantity}x {item.nameSnapshot}
                  </span>
                </div>
                <span className="font-bold text-slate-900">
                  ₦{((item.priceKoboSnapshot * item.quantity) / 100).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.serviceType === "SHOP_FOR_ME" && order.shopForMeDetails && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-amber-600" />
              Shop for Me Procurement Checklist
            </h3>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              {order.shopForMeDetails.reconciliationStatus}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Target Store / Market</span>
              <strong className="text-slate-900 font-semibold">{order.shopForMeDetails.shopName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Goods Budget (Escrow)</span>
              <strong className="text-slate-900 font-semibold">₦{(order.shopForMeDetails.goodsBudgetKobo / 100).toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Substitution Policy</span>
              <strong className="text-slate-900 font-semibold">{order.shopForMeDetails.substitutionPreference}</strong>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-sm">
            {order.shopForMeDetails.items.map((it) => (
              <div key={it.id} className="py-2.5 flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">
                    {it.quantity} {it.unit} • {it.itemName}
                  </p>
                  {it.notes && <p className="text-xs text-slate-500 mt-0.5">{it.notes}</p>}
                </div>
              </div>
            ))}
          </div>

          {order.shopForMeDetails.actualGoodsSpentKobo !== null && (
            <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block">Reconciled Market Receipt Total</span>
                <span className="text-sm font-bold text-emerald-400">
                  ₦{(order.shopForMeDetails.actualGoodsSpentKobo / 100).toLocaleString()}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-300">
                Any remainder credited back to customer account.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Nelo Customer Care</h3>
            <p className="text-xs text-slate-500">
              Reference Order: <strong className="font-mono text-slate-800">{order.orderNumber}</strong>
            </p>
            <div className="space-y-2 text-xs">
              <a
                href="tel:+23418006356"
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 hover:bg-slate-100 transition"
              >
                <Phone className="h-4 w-4 text-nelo-600" />
                <div>
                  <p className="font-bold text-slate-800">Phone Support (Toll-Free)</p>
                  <p className="text-slate-500">01-800-NELO-HELP</p>
                </div>
              </a>
              <div className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <HelpCircle className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="font-bold text-slate-800">WhatsApp Dispatch Desk</p>
                  <p className="text-slate-500">+234 800 000 6356</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
