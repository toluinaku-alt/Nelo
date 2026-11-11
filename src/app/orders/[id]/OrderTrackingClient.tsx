"use client";

import { useState, useTransition } from "react";
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
  Send,
  Lock,
  Unlock,
  Check,
  X,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  CreditCard,
  Camera,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ServiceBadge } from "@/components/ServiceBadge";
import { MapMock } from "@/components/MapMock";
import {
  customerRespondApprovalAction,
  sendOrderMessageAction,
} from "@/lib/actions";

interface OrderTrackingProps {
  currentUser: {
    id: string;
    role: string;
    name: string;
  };
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
      stage: string;
      assignedAdminId?: string | null;
      assignedAdminName?: string | null;
      shopQuoteKobo?: number | null;
      shopPaymentStatus: string;
      shopPaymentAmountKobo?: number | null;
      shopPaymentRef?: string | null;
      shopPaymentMethod?: string | null;
      shopPaidAt?: string | null;
      customerApprovedAt?: string | null;
      pickupLocked: boolean;
      pickupReleasedAt?: string | null;
      customerApprovalStatus: string;
      customerApprovalReason?: string | null;
      actualGoodsSpentKobo?: number | null;
      reconciledBalanceKobo?: number;
      reconciliationStatus: string;
      items: {
        id: string;
        itemName: string;
        quantity: number;
        unit: string | null;
        notes: string | null;
        photoUrl?: string | null;
        itemStatus: string;
        actualPriceKobo?: number | null;
        proposedSubName?: string | null;
        proposedSubPriceKobo?: number | null;
        proposedSubNotes?: string | null;
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
      actorRole?: string;
      createdAt: string;
    }[];
    messages?: {
      id: string;
      senderId: string;
      senderRole: string;
      senderName: string;
      message: string;
      attachmentUrl?: string | null;
      createdAt: string;
    }[];
  };
}

export function OrderTrackingClient({ currentUser, order }: OrderTrackingProps) {
  const [isPending, startTransition] = useTransition();
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "chat">("overview");

  // Message compose state
  const [chatInput, setChatInput] = useState("");
  const [approvalNote, setApprovalNote] = useState("");

  // Parse addresses safely
  let pickup = { name: "Pickup Location", address: "Pickup Address", latitude: 4.9650, longitude: 8.3300 };
  let dropoff = { name: "Delivery Destination", address: "Delivery Address", latitude: 4.9750, longitude: 8.3400 };

  try {
    pickup = JSON.parse(order.pickupAddressJson);
  } catch (e) {}

  try {
    dropoff = JSON.parse(order.dropoffAddressJson);
  } catch (e) {}

  const isCustomer = currentUser.role === "CUSTOMER";
  const sfm = order.shopForMeDetails;

  // Handle Customer Approval / Rejection
  const handleApprovalResponse = (approved: boolean) => {
    startTransition(async () => {
      try {
        await customerRespondApprovalAction({
          orderId: order.id,
          approved,
          notes: approvalNote.trim() || (approved ? "Approved by customer" : "Declined by customer"),
        });
      } catch (err: any) {
        alert(err.message || "Failed to submit approval.");
      }
    });
  };

  // Handle Sending a Message in the Tri-Party Thread
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const msg = chatInput.trim();
    setChatInput("");

    startTransition(async () => {
      try {
        await sendOrderMessageAction({
          orderId: order.id,
          message: msg,
        });
      } catch (err: any) {
        alert(err.message || "Failed to send message.");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 w-full min-w-0 overflow-x-hidden">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition shadow-2xs"
            title="Back to Orders"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {order.orderNumber}
              </h1>
              <ServiceBadge type={order.serviceType} />
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })} at{" "}
              {new Date(order.createdAt).toLocaleTimeString("en-NG", { timeStyle: "short" })}
            </p>
          </div>
        </div>

        {/* Tab Switcher: Overview vs Tri-Party Thread */}
        <div className="inline-flex self-start sm:self-auto bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "overview"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Order Tracking
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "chat"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
            <span>Order Messages</span>
            {order.messages && order.messages.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {order.messages.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Customer Approval Prompt Banner (If quote or substitutions need approval) */}
      {sfm && sfm.customerApprovalStatus === "PENDING" && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 shadow-md space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm sm:text-base text-amber-950">
                Customer Action Required: Review In-Store Quote & Changes
              </h3>
              <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
                Your runner Emeka Obi has verified prices at <strong>{sfm.shopName}</strong>.
                The in-store quote is{" "}
                <span className="font-bold text-amber-950">
                  ₦{((sfm.shopQuoteKobo || 0) / 100).toLocaleString()}
                </span>
                {sfm.shopQuoteKobo && sfm.shopQuoteKobo > sfm.goodsBudgetKobo && (
                  <span>
                    {" "}
                    (₦{(((sfm.shopQuoteKobo || 0) - sfm.goodsBudgetKobo) / 100).toLocaleString()} above original
                    estimate)
                  </span>
                )}
                . Some items may have substitutions or price adjustments.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <input
              type="text"
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="Optional response notes to rider & admin..."
              className="text-xs rounded-xl border border-amber-300 px-3 py-2 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 flex-1"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleApprovalResponse(false)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold transition shadow-2xs"
              >
                <X className="h-4 w-4" /> Reject Changes
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleApprovalResponse(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
              >
                <Check className="h-4 w-4" /> Approve & Pay Shop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: OVERVIEW & TRACKING */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Shop for Me Pilot Workflow Milestone Card */}
          {sfm && (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Calabar Shop for Me Fulfillment Pipeline
                    </h3>
                    <p className="text-xs text-slate-500">
                      Direct merchant transfer • Rider does not collect cash
                    </p>
                  </div>
                </div>

                {/* Responsible Team */}
                <div className="flex items-center gap-2 text-xs self-start sm:self-auto">
                  <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                    Admin: {sfm.assignedAdminName || "Folake Daniels"}
                  </span>
                  <span className="font-semibold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg">
                    Rider: {order.delivery?.rider?.user.fullName || "Emeka Obi"}
                  </span>
                </div>
              </div>

              {/* Step Flow Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {/* Step 1: Requested */}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>1. Escrow Held</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    ₦{(sfm.goodsBudgetKobo / 100).toLocaleString()} held in Nelo Escrow
                  </p>
                </div>

                {/* Step 2: Rider at Shop */}
                <div
                  className={`p-3 rounded-xl border space-y-1 ${
                    sfm.stage === "RIDER_AT_SHOP" ||
                    sfm.stage === "QUOTE_SUBMITTED" ||
                    sfm.stage === "CUSTOMER_APPROVAL_PENDING" ||
                    sfm.stage === "SHOP_PAYMENT_PENDING" ||
                    sfm.stage === "PICKUP_RELEASED" ||
                    order.status === "DELIVERED"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {sfm.stage === "RIDER_AT_SHOP" ? (
                      <RefreshCw className="h-4 w-4 text-amber-600 animate-spin" />
                    ) : sfm.stage === "REQUESTED" || sfm.stage === "ASSIGNED" ? (
                      <Circle className="h-4 w-4 text-slate-300" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                    <span>2. In-Store Quote</span>
                  </div>
                  <p className="text-[11px]">
                    {sfm.shopQuoteKobo
                      ? `Quote: ₦${(sfm.shopQuoteKobo / 100).toLocaleString()}`
                      : "Runner checking shelves"}
                  </p>
                </div>

                {/* Step 3: Admin Pays Shop */}
                <div
                  className={`p-3 rounded-xl border space-y-1 ${
                    sfm.shopPaymentStatus === "CONFIRMED"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : sfm.stage === "SHOP_PAYMENT_PENDING"
                      ? "bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-400"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {sfm.shopPaymentStatus === "CONFIRMED" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : sfm.stage === "SHOP_PAYMENT_PENDING" ? (
                      <CreditCard className="h-4 w-4 text-amber-600 animate-pulse" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300" />
                    )}
                    <span>3. Admin Shop Pay</span>
                  </div>
                  <p className="text-[11px]">
                    {sfm.shopPaymentStatus === "CONFIRMED"
                      ? `Paid via ${sfm.shopPaymentMethod || "Transfer"}`
                      : "Direct merchant transfer"}
                  </p>
                </div>

                {/* Step 4: Pickup Released */}
                <div
                  className={`p-3 rounded-xl border space-y-1 ${
                    !sfm.pickupLocked
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {!sfm.pickupLocked ? (
                      <Unlock className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-slate-400" />
                    )}
                    <span>4. Pickup Release</span>
                  </div>
                  <p className="text-[11px]">
                    {!sfm.pickupLocked ? "Items released to rider" : "Pickup locked until paid"}
                  </p>
                </div>
              </div>

              {/* Pickup Lock Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  sfm.pickupLocked
                    ? "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-emerald-50/70 border-emerald-200 text-emerald-950 font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {sfm.pickupLocked ? (
                    <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                  ) : (
                    <Unlock className="h-4 w-4 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">
                      {sfm.pickupLocked
                        ? "Pickup Locked (Zero-Advance Policy Active)"
                        : "Pickup Released by Admin"}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {sfm.pickupLocked
                        ? "Rider cannot collect goods until responsible admin records confirmed shop payment."
                        : `Admin transfer confirmed (Ref: ${sfm.shopPaymentRef || "TRF-VERIFIED"}). Goods handed to rider.`}
                    </p>
                  </div>
                </div>
                {!sfm.pickupLocked && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    Verified
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Map and Route Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-600" />
                    <span>Calabar Pilot Route</span>
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {order.delivery?.distanceKm || 4.2} km • Est.{" "}
                    {order.delivery?.estimatedDurationMinutes || 30} mins
                  </span>
                </div>

                <MapMock
                  pickup={pickup}
                  dropoff={dropoff}
                  riderCoordinates={
                    order.delivery?.rider
                      ? { latitude: 4.9650, longitude: 8.3300 }
                      : undefined
                  }
                  status={order.status}
                />

                {/* Stop details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Market / Shop Stop
                    </span>
                    <p className="font-bold text-slate-800">{pickup.name || "Calabar Market"}</p>
                    <p className="text-slate-500 text-[11px] break-words">{pickup.address}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Delivery Destination
                    </span>
                    <p className="font-bold text-slate-800">{dropoff.name || "Customer Destination"}</p>
                    <p className="text-slate-500 text-[11px] break-words">{dropoff.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rider & Financial Side Card */}
            <div className="space-y-4 sm:space-y-6">
              {/* Rider Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Assigned Calabar Runner
                </h3>

                {order.delivery?.rider ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-800 font-black text-lg flex items-center justify-center shrink-0">
                        <Bike className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {order.delivery.rider.user.fullName}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Plate:{" "}
                          <span className="font-mono font-semibold text-slate-700">
                            {order.delivery.rider.plateNumber || "CAL-WTT-402"}
                          </span>
                        </p>
                        <span className="inline-block mt-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          Calabar Pilot Fleet • ⭐ 4.9
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab("chat")}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Chat with Rider & Admin
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                    Matching with Calabar runners...
                  </div>
                )}
              </div>

              {/* Financial Breakdown */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Payment & Escrow Breakdown
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Initial Goods Budget:</span>
                    <span className="font-bold text-slate-900">
                      ₦{(order.subtotalKobo / 100).toLocaleString()}
                    </span>
                  </div>
                  {sfm && (
                    <div className="flex justify-between text-slate-600">
                      <span>Approved Spending Ceiling:</span>
                      <span className="font-bold text-amber-900">
                        ₦{(sfm.spendingLimitKobo / 100).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Concierge Shopping Fee:</span>
                    <span className="font-bold text-slate-900">
                      ₦{(order.serviceFeeKobo / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Calabar City Delivery:</span>
                    <span className="font-bold text-slate-900">
                      ₦{(order.deliveryFeeKobo / 100).toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-extrabold text-slate-900">
                    <span>Total Initial Hold:</span>
                    <span className="text-amber-600">
                      ₦{(order.totalAmountKobo / 100).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Final Reconciliation Card if completed */}
                {sfm && sfm.actualGoodsSpentKobo != null && sfm.actualGoodsSpentKobo > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-900 text-white space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide block font-semibold">
                      Final Purchase Reconciliation
                    </span>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Actual Shop Receipt:</span>
                      <span className="font-bold text-emerald-400">
                        ₦{(sfm.actualGoodsSpentKobo / 100).toLocaleString()}
                      </span>
                    </div>
                    {sfm.reconciledBalanceKobo !== undefined && sfm.reconciledBalanceKobo > 0 && (
                      <div className="flex justify-between text-xs pt-1 border-t border-slate-800 text-emerald-300 font-bold">
                        <span>Unspent Balance Refunded:</span>
                        <span>₦{(sfm.reconciledBalanceKobo / 100).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Shopping Checklist Items with Photos & Availability */}
          {sfm && sfm.items && sfm.items.length > 0 && (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-amber-600" />
                  <span>Procurement Checklist ({sfm.items.length} items)</span>
                </h3>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Policy: {sfm.substitutionPreference}
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                {sfm.items.map((it) => (
                  <div key={it.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-3">
                      {it.photoUrl ? (
                        <img
                          src={it.photoUrl}
                          alt={it.itemName}
                          className="h-12 w-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                      )}

                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900">
                          {it.quantity} {it.unit} • {it.itemName}
                        </p>
                        {it.notes && <p className="text-xs text-slate-500">{it.notes}</p>}

                        {/* Substitution proposed notice */}
                        {it.proposedSubName && (
                          <div className="inline-block mt-1 text-[11px] font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
                            Proposed Sub: {it.proposedSubName}{" "}
                            {it.proposedSubPriceKobo && (
                              <span>(₦{(it.proposedSubPriceKobo / 100).toLocaleString()})</span>
                            )}
                            {it.proposedSubNotes && <span> • {it.proposedSubNotes}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="self-end sm:self-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          it.itemStatus === "AVAILABLE"
                            ? "bg-emerald-100 text-emerald-800"
                            : it.itemStatus === "SUBSTITUTED"
                            ? "bg-amber-100 text-amber-800"
                            : it.itemStatus === "UNAVAILABLE"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {it.itemStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TRI-PARTY ORDER MESSAGE THREAD */}
      {activeTab === "chat" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[600px]">
          {/* Thread Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="h-5 w-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-sm">Tri-Party Communications Desk</h3>
                <p className="text-[11px] text-slate-400">
                  Customer (You) • Rider ({order.delivery?.rider?.user.fullName || "Emeka"}) • Admin (
                  {sfm?.assignedAdminName || "Folake"})
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
              Live Order Thread
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {order.messages && order.messages.length > 0 ? (
              order.messages.map((m) => {
                const isMe = m.senderRole === currentUser.role;
                const isAdmin = m.senderRole === "ADMIN";
                const isRider = m.senderRole === "RIDER";

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                      isMe ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px]">
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded ${
                          isAdmin
                            ? "bg-purple-100 text-purple-800"
                            : isRider
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {m.senderRole}
                      </span>
                      <span className="font-medium text-slate-600">{m.senderName}</span>
                      <span className="text-slate-400">
                        {new Date(m.createdAt).toLocaleTimeString("en-NG", { timeStyle: "short" })}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                        isMe
                          ? "bg-amber-600 text-white rounded-tr-none"
                          : isAdmin
                          ? "bg-slate-900 text-white rounded-tl-none"
                          : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                      }`}
                    >
                      <p>{m.message}</p>
                      {m.attachmentUrl && (
                        <img
                          src={m.attachmentUrl}
                          alt="Attachment"
                          className="mt-2 rounded-lg max-h-40 object-cover"
                        />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No messages yet. Send a message below to coordinate with your rider and responsible admin.
              </div>
            )}
          </div>

          {/* Message Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Message rider & admin as ${currentUser.name}...`}
              className="flex-1 text-xs sm:text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={isPending || !chatInput.trim()}
              className="inline-flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Send</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
