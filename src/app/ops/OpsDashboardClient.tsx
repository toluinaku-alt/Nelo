"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  MapPin,
  Bike,
  ClipboardList,
  DollarSign,
  History,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  FileText,
  UserCheck,
  Scale,
  ArrowRightLeft,
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
  CreditCard,
  Lock,
  Unlock,
  Check,
  X,
  MessageSquare,
  Clock,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ServiceBadge } from "@/components/ServiceBadge";
import { MapMock } from "@/components/MapMock";
import {
  opsReassignDeliveryAction,
  opsIssueRefundAction,
  adminConfirmShopPaymentAction,
  adminReportPaymentFailedAction,
  adminHandleNoCustomerReplyAction,
  reconcileAndCompleteShopForMeAction,
} from "@/lib/actions";

interface OpsDashboardProps {
  currentStaff: {
    id: string;
    fullName: string;
    role: string;
    email: string;
  };
  orders: {
    id: string;
    orderNumber: string;
    serviceType: string;
    status: string;
    createdAt: string;
    totalAmountKobo: number;
    subtotalKobo: number;
    deliveryFeeKobo: number;
    serviceFeeKobo: number;
    customerName: string;
    customerPhone: string | null;
    zoneName: string;
    shopForMeDetails?: {
      id: string;
      shopName: string;
      shopAddress: string;
      goodsBudgetKobo: number;
      spendingLimitKobo: number;
      stage: string;
      assignedAdminName?: string | null;
      shopQuoteKobo?: number | null;
      shopPaymentStatus: string;
      shopPaymentAmountKobo?: number | null;
      shopPaymentRef?: string | null;
      shopPaymentMethod?: string | null;
      pickupLocked: boolean;
      customerApprovalStatus: string;
      customerApprovalReason?: string | null;
      actualGoodsSpentKobo?: number | null;
      reconciledBalanceKobo?: number;
      reconciliationStatus: string;
      items?: {
        id: string;
        itemName: string;
        quantity: number;
        unit: string | null;
        itemStatus: string;
        actualPriceKobo?: number | null;
        proposedSubName?: string | null;
        proposedSubPriceKobo?: number | null;
      }[];
    } | null;
    delivery?: {
      id: string;
      status: string;
      riderId: string | null;
      riderName: string | null;
      riderPlate: string | null;
    } | null;
  }[];
  riders: {
    id: string;
    userId: string;
    fullName: string;
    plateNumber: string | null;
    isOnline: boolean;
    totalDeliveries: number;
    rating: number;
    walletBalanceKobo: number;
  }[];
  ledgerAccounts: {
    id: string;
    code: string;
    name: string;
    type: string;
    balanceKobo: number;
  }[];
  ledgerEntries: {
    id: string;
    orderNumber?: string;
    debitAccount: string;
    creditAccount: string;
    amountKobo: number;
    description: string;
    isCompensating: boolean;
    createdAt: string;
  }[];
  auditLogs: {
    id: string;
    userName: string;
    userRole: string;
    action: string;
    targetResource: string;
    targetId: string;
    reason: string;
    createdAt: string;
  }[];
}

export function OpsDashboardClient({
  currentStaff,
  orders,
  riders,
  ledgerAccounts,
  ledgerEntries,
  auditLogs,
}: OpsDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<
    "shopForMe" | "board" | "map" | "finance" | "audit"
  >("shopForMe");

  // Filters
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Reassignment Modal State
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [targetRiderId, setTargetRiderId] = useState(riders[0]?.id || "");
  const [auditReason, setAuditReason] = useState("");

  // Refund Modal State
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState("");

  // Shop For Me Payment Modal State
  const [paymentModalOrder, setPaymentModalOrder] = useState<any | null>(null);
  const [paymentAmountNaira, setPaymentAmountNaira] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("OPAY_DIRECT_TRANSFER");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Payment Failed Modal
  const [failModalOrder, setFailModalOrder] = useState<any | null>(null);
  const [failReason, setFailReason] = useState("");

  // Customer No-Reply Modal
  const [noReplyOrder, setNoReplyOrder] = useState<any | null>(null);

  // Reconciliation Modal
  const [reconcileOrder, setReconcileOrder] = useState<any | null>(null);
  const [actualSpentNaira, setActualSpentNaira] = useState<number>(0);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filtered Orders for general board
  const filteredOrders = orders.filter((o) => {
    if (serviceFilter !== "ALL" && o.serviceType !== serviceFilter) return false;
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (
      searchQuery &&
      !o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !o.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Shop for Me Specific Buckets
  const sfmOrders = orders.filter((o) => o.serviceType === "SHOP_FOR_ME");

  const waitingRider = sfmOrders.filter(
    (o) =>
      !o.delivery?.riderId ||
      o.status === "AWAITING_RIDER" ||
      o.shopForMeDetails?.stage === "REQUESTED"
  );

  const ridersAtShops = sfmOrders.filter(
    (o) => o.status === "RIDER_AT_SHOP" || o.shopForMeDetails?.stage === "RIDER_AT_SHOP"
  );

  const customerApprovalsNeeded = sfmOrders.filter(
    (o) =>
      o.status === "CUSTOMER_APPROVAL_PENDING" ||
      o.shopForMeDetails?.customerApprovalStatus === "PENDING"
  );

  const paymentsPending = sfmOrders.filter(
    (o) =>
      (o.status === "SHOP_PAYMENT_PENDING" ||
        o.shopForMeDetails?.stage === "SHOP_PAYMENT_PENDING") &&
      o.shopForMeDetails?.pickupLocked
  );

  const pickupsReady = sfmOrders.filter(
    (o) =>
      o.shopForMeDetails &&
      !o.shopForMeDetails.pickupLocked &&
      ["PICKUP_RELEASED", "PICKED_UP", "IN_TRANSIT"].includes(o.status)
  );

  const completedOrRefunded = sfmOrders.filter((o) =>
    ["DELIVERED", "CANCELLED", "REFUNDED"].includes(o.status)
  );

  // Action: Confirm Shop Payment
  const handleConfirmShopPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalOrder) return;
    if (paymentAmountNaira <= 0 || !paymentRef.trim()) {
      setFeedback({
        type: "error",
        message: "Please enter a valid transfer amount and merchant payment reference.",
      });
      return;
    }

    startTransition(async () => {
      try {
        await adminConfirmShopPaymentAction({
          orderId: paymentModalOrder.id,
          amountKobo: Math.round(paymentAmountNaira * 100),
          paymentRef: paymentRef.trim(),
          paymentMethod,
          notes: paymentNotes.trim(),
        });

        setFeedback({
          type: "success",
          message: `Payment of ₦${paymentAmountNaira.toLocaleString()} confirmed to merchant for ${
            paymentModalOrder.orderNumber
          }. Pickup is RELEASED!`,
        });
        setPaymentModalOrder(null);
        setPaymentRef("");
        router.refresh();
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
    });
  };

  // Action: Report Payment Failed
  const handleReportPaymentFailed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!failModalOrder || !failReason.trim()) return;

    startTransition(async () => {
      try {
        await adminReportPaymentFailedAction({
          orderId: failModalOrder.id,
          reason: failReason.trim(),
        });

        setFeedback({
          type: "error",
          message: `Payment failure logged for ${failModalOrder.orderNumber}. Rider & customer notified.`,
        });
        setFailModalOrder(null);
        setFailReason("");
        router.refresh();
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
    });
  };

  // Action: Handle Customer No-Reply
  const handleNoReplyResolve = (action: "SKIP_UNAVAILABLE_PROCEED" | "CANCEL_AND_REFUND") => {
    if (!noReplyOrder) return;

    startTransition(async () => {
      try {
        await adminHandleNoCustomerReplyAction({
          orderId: noReplyOrder.id,
          action,
        });

        setFeedback({
          type: "success",
          message:
            action === "SKIP_UNAVAILABLE_PROCEED"
              ? `Unavailable items skipped for ${noReplyOrder.orderNumber}. Proceeded to payment.`
              : `Order ${noReplyOrder.orderNumber} cancelled and refunded due to customer timeout.`,
        });
        setNoReplyOrder(null);
        router.refresh();
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
    });
  };

  // Action: Reconcile & Complete Order
  const handleReconcileOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileOrder) return;

    startTransition(async () => {
      try {
        const res = await reconcileAndCompleteShopForMeAction({
          orderId: reconcileOrder.id,
          actualSpentKobo: Math.round(actualSpentNaira * 100),
        });

        setFeedback({
          type: "success",
          message: `Order ${reconcileOrder.orderNumber} successfully completed and reconciled. Balance: ₦${(
            (res.reconciledBalanceKobo || 0) / 100
          ).toLocaleString()}`,
        });
        setReconcileOrder(null);
        router.refresh();
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 w-full min-w-0 overflow-x-hidden">
      {/* Staff Ops Header */}
      <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-500 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg shrink-0">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Nelo Central Operations — Calabar Pilot
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                Calabar Command
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active Operator: <strong className="text-slate-200">{currentStaff.fullName}</strong> ({currentStaff.role}) • 
              Serving Calabar Municipal & Calabar South
            </p>
          </div>
        </div>

        {/* Fleet Metrics */}
        <div className="flex items-center gap-2.5 sm:gap-3 self-stretch sm:self-auto">
          <div className="flex-1 sm:flex-initial p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Pilot Orders
            </span>
            <span className="text-base sm:text-lg font-black text-amber-400">
              {sfmOrders.length}
            </span>
          </div>

          <div className="flex-1 sm:flex-initial p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Payments Pending
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-400">
              {paymentsPending.length}
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 shadow-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-900 border border-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <p>{feedback.message}</p>
        </div>
      )}

      {/* Operations Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("shopForMe")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "shopForMe"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>Calabar Shop for Me Pilot ({sfmOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("board")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "board"
              ? "bg-slate-900 text-emerald-400 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          <span>All Orders Board ({filteredOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("map")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "map"
              ? "bg-slate-900 text-emerald-400 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>Fleet Map</span>
        </button>

        <button
          onClick={() => setActiveTab("finance")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "finance"
              ? "bg-slate-900 text-emerald-400 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Scale className="h-3.5 w-3.5" />
          <span>Double-Entry Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "audit"
              ? "bg-slate-900 text-emerald-400 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Audit Log ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: CALABAR SHOP FOR ME PILOT WORKFLOW MANAGEMENT */}
      {activeTab === "shopForMe" && (
        <div className="space-y-6">
          {/* 5 Column Status Buckets for Ops Supervision */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
            {/* 1. Waiting for Rider */}
            <div className="bg-slate-100/90 rounded-2xl p-3.5 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    1. Waiting for Rider
                  </span>
                  <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-full shadow-2xs">
                    {waitingRider.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Requests needing runner acceptance in Calabar
                </p>
              </div>
            </div>

            {/* 2. Riders at Shops */}
            <div className="bg-amber-50/80 rounded-2xl p-3.5 border border-amber-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Bike className="h-3.5 w-3.5 text-amber-600" />
                    2. In-Store Checking
                  </span>
                  <span className="font-mono font-bold bg-white text-amber-900 px-2 py-0.5 rounded-full shadow-2xs">
                    {ridersAtShops.length}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-normal">
                  Riders at market preparing quote & checking stock
                </p>
              </div>
            </div>

            {/* 3. Customer Approvals Needed */}
            <div className="bg-amber-100/70 rounded-2xl p-3.5 border border-amber-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    3. Approvals Needed
                  </span>
                  <span className="font-mono font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full shadow-2xs">
                    {customerApprovalsNeeded.length}
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 leading-normal">
                  Substitutions or quotes exceeding approved budget
                </p>
              </div>
            </div>

            {/* 4. Payments Pending (Admin Action) */}
            <div className="bg-emerald-50/80 rounded-2xl p-3.5 border border-emerald-300 flex flex-col justify-between ring-1 ring-emerald-400">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-emerald-700" />
                    4. Payments Pending
                  </span>
                  <span className="font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                    {paymentsPending.length}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-normal">
                  Admin transfer to shop required to unlock pickup
                </p>
              </div>
            </div>

            {/* 5. Pickups Ready & In-Transit */}
            <div className="bg-purple-50/80 rounded-2xl p-3.5 border border-purple-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-purple-950 flex items-center gap-1.5">
                    <Unlock className="h-3.5 w-3.5 text-purple-700" />
                    5. Pickups Released
                  </span>
                  <span className="font-mono font-bold bg-white text-purple-900 px-2 py-0.5 rounded-full shadow-2xs">
                    {pickupsReady.length}
                  </span>
                </div>
                <p className="text-[11px] text-purple-800 leading-normal">
                  Merchant paid; rider cleared to deliver
                </p>
              </div>
            </div>
          </div>

          {/* Active Shop for Me Requests in Calabar */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-amber-600" />
              <span>Active Calabar Pilot Requests ({sfmOrders.length})</span>
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {sfmOrders.map((order) => {
                const sfm = order.shopForMeDetails;
                if (!sfm) return null;

                const isLocked = sfm.pickupLocked;
                const quoteNaira = (sfm.shopQuoteKobo || sfm.goodsBudgetKobo) / 100;
                const isOverBudget = sfm.shopQuoteKobo && sfm.shopQuoteKobo > sfm.spendingLimitKobo;
                const isPendingCustomer = sfm.customerApprovalStatus === "PENDING";
                const isReadyToPay =
                  (order.status === "SHOP_PAYMENT_PENDING" || sfm.stage === "SHOP_PAYMENT_PENDING") &&
                  isLocked;

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl p-5 border shadow-sm transition space-y-4 ${
                      isPendingCustomer
                        ? "border-amber-400 bg-amber-50/20"
                        : isReadyToPay
                        ? "border-emerald-400 bg-emerald-50/20"
                        : "border-slate-200"
                    }`}
                  >
                    {/* Top Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-sm text-slate-900">
                            {order.orderNumber}
                          </span>
                          <StatusBadge status={order.status} />
                          <span className="font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {order.zoneName}
                          </span>
                          {isLocked ? (
                            <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Pickup Locked
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <Unlock className="h-3 w-3" /> Pickup Released
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 mt-1">
                          Customer: <strong className="text-slate-800">{order.customerName}</strong> •
                          Runner: <strong>{order.delivery?.riderName || "Unassigned"}</strong> •
                          Responsible Admin: <strong>{sfm.assignedAdminName || "Folake Daniels"}</strong>
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Budget & In-Store Quote
                        </span>
                        <span className="text-base font-black text-slate-900">
                          ₦{quoteNaira.toLocaleString()}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            / Cap: ₦{(sfm.spendingLimitKobo / 100).toLocaleString()}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Middle: Store and Item Checks */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Verified Shop / Market
                        </span>
                        <p className="font-bold text-slate-900">{sfm.shopName}</p>
                        <p className="text-slate-500 text-[11px] truncate">{sfm.shopAddress}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Customer Approval State
                        </span>
                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                          {isPendingCustomer ? (
                            <span className="text-amber-700 font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" /> Awaiting Customer Approval
                            </span>
                          ) : sfm.customerApprovalStatus === "APPROVED" ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Customer Approved
                            </span>
                          ) : sfm.customerApprovalStatus === "REJECTED" ? (
                            <span className="text-red-700 font-bold flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5" /> Customer Rejected
                            </span>
                          ) : (
                            <span className="text-slate-600">Standard (Within Limit)</span>
                          )}
                        </p>
                        {sfm.customerApprovalReason && (
                          <p className="text-[11px] text-slate-500">
                            Note: {sfm.customerApprovalReason}
                          </p>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Merchant Settlement Status
                        </span>
                        <p className="font-bold text-slate-900">
                          {sfm.shopPaymentStatus === "CONFIRMED" ? (
                            <span className="text-emerald-700">
                              Paid (Ref: {sfm.shopPaymentRef})
                            </span>
                          ) : sfm.shopPaymentStatus === "FAILED" ? (
                            <span className="text-red-700">Payment Transfer Failed</span>
                          ) : isReadyToPay ? (
                            <span className="text-amber-700">Ready for Admin Settlement</span>
                          ) : (
                            <span className="text-slate-500">Awaiting In-Store Quote</span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {isLocked ? "Rider cannot collect items" : "Items in custody of rider"}
                        </p>
                      </div>
                    </div>

                    {/* Checklist summary */}
                    {sfm.items && sfm.items.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                        <span className="font-bold text-slate-700 block mb-1">
                          Items Checklist ({sfm.items.length} items):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {sfm.items.map((it) => (
                            <span
                              key={it.id}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                                it.itemStatus === "AVAILABLE"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : it.itemStatus === "SUBSTITUTED"
                                  ? "bg-amber-50 text-amber-900 border-amber-300"
                                  : it.itemStatus === "UNAVAILABLE"
                                  ? "bg-red-50 text-red-800 border-red-200"
                                  : "bg-white text-slate-700 border-slate-200"
                              }`}
                            >
                              {it.quantity} {it.unit} {it.itemName} ({it.itemStatus})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Bar for Admin Supervision */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition flex items-center gap-1.5"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Open Tri-Party Chat</span>
                        </Link>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 1. Customer No-Reply Exception Handler */}
                        {isPendingCustomer && (
                          <button
                            type="button"
                            onClick={() => setNoReplyOrder(order)}
                            className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 font-bold hover:bg-amber-100 transition"
                          >
                            Handle No-Reply Timeout
                          </button>
                        )}

                        {/* 2. Admin Pay Merchant & Release Pickup Button */}
                        {isReadyToPay && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentModalOrder(order);
                              setPaymentAmountNaira(quoteNaira);
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow-sm transition flex items-center gap-1.5"
                          >
                            <CreditCard className="h-4 w-4" />
                            <span>Pay Merchant & Release Pickup (₦{quoteNaira.toLocaleString()})</span>
                          </button>
                        )}

                        {/* 3. Report Payment Failure */}
                        {isReadyToPay && (
                          <button
                            type="button"
                            onClick={() => setFailModalOrder(order)}
                            className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 font-semibold transition"
                          >
                            Report Failed Payment
                          </button>
                        )}

                        {/* 4. Complete & Reconcile upon delivery */}
                        {order.status === "DELIVERED" && sfm.reconciliationStatus === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => {
                              setReconcileOrder(order);
                              setActualSpentNaira(quoteNaira);
                            }}
                            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold transition shadow-sm flex items-center gap-1.5"
                          >
                            <Scale className="h-4 w-4" />
                            <span>Reconcile Ledger & Refund Balance</span>
                          </button>
                        )}

                        {/* 5. Cancellation & Full Refund */}
                        {!["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status) && (
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForRefund(order)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 font-semibold transition"
                          >
                            Cancel & Refund
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL ORDER BOARD */}
      {activeTab === "board" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-500 uppercase text-[10px]">
                Service:
              </span>
              {["ALL", "MARKETPLACE", "SHOP_FOR_ME", "PACKAGE"].map((s) => (
                <button
                  key={s}
                  onClick={() => setServiceFilter(s)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    serviceFilter === s
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search order ref or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Order Ref</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Zone</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Rider</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {o.orderNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <ServiceBadge serviceType={o.serviceType} />
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {o.customerName}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {o.customerPhone || "—"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{o.zoneName}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ₦{(o.totalAmountKobo / 100).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        {o.delivery?.riderName ? (
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              {o.delivery.riderName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {o.delivery.riderPlate || "LAGOS-RDR"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-700 font-medium">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/orders/${o.id}`}
                          className="font-bold text-nelo-600 hover:text-nelo-700"
                        >
                          View Live →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FLEET MAP */}
      {activeTab === "map" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Calabar Active Fleet & Geofence Visualizer
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              Pilot Perimeter: Calabar Municipal & Calabar South
            </span>
          </div>

          <MapMock
            pickup={{
              name: "Marian Market (Calabar Municipal)",
              address: "Marian Road, Calabar",
              latitude: 4.9757,
              longitude: 8.3417,
            }}
            dropoff={{
              name: "State Housing Estate (Delivery Point)",
              address: "12 State Housing Estate, Calabar",
              latitude: 4.9757,
              longitude: 8.3417,
            }}
            riderCoordinates={{ latitude: 4.9650, longitude: 8.3300 }}
            status="IN_TRANSIT"
          />
        </div>
      )}

      {/* TAB 4: FINANCE & LEDGER */}
      {activeTab === "finance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ledgerAccounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {acc.code}
                  </span>
                  <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {acc.type}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-800">{acc.name}</h4>
                <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">Ledger Balance:</span>
                  <span className="text-lg font-black text-slate-900">
                    ₦{(acc.balanceKobo / 100).toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Recent Append-Only Ledger Journal Entries
              </h4>
              <span className="text-[11px] text-slate-500">Double-entry integer kobo records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Debit Account</th>
                    <th className="py-2.5 px-4">Credit Account</th>
                    <th className="py-2.5 px-4">Amount (NGN)</th>
                    <th className="py-2.5 px-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {ledgerEntries.map((le) => (
                    <tr key={le.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-500">
                        {new Date(le.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-red-700">
                        {le.debitAccount}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-emerald-700">
                        {le.creditAccount}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 font-sans">
                        ₦{(le.amountKobo / 100).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 font-sans">{le.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Privileged Staff Audit Log
            </h4>
            <span className="text-[11px] text-slate-500">Immutable trace with mandatory reasons</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Target</th>
                  <th className="py-2.5 px-4">Mandatory Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.userName} ({log.userRole})
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {log.targetResource} #{log.targetId.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: PAY MERCHANT & RELEASE PICKUP */}
      {paymentModalOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmShopPayment}
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Pay Merchant & Release Pickup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p>
                <strong>Order:</strong> {paymentModalOrder.orderNumber}
              </p>
              <p>
                <strong>Merchant:</strong>{" "}
                {paymentModalOrder.shopForMeDetails?.shopName} (
                {paymentModalOrder.shopForMeDetails?.shopAddress})
              </p>
              <p>
                <strong>Rider in Store:</strong>{" "}
                {paymentModalOrder.delivery?.riderName || "Emeka Obi"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Actual Amount Transferred to Merchant (₦) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-500">₦</span>
                <input
                  type="number"
                  required
                  min={100}
                  step={100}
                  value={paymentAmountNaira}
                  onChange={(e) => setPaymentAmountNaira(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="OPAY_DIRECT_TRANSFER">Opay Direct Transfer</option>
                  <option value="PALMPAY_DIRECT_TRANSFER">PalmPay Direct Transfer</option>
                  <option value="GTBANK_NIP">GTBank NIP Transfer</option>
                  <option value="FIRST_BANK_NIP">First Bank NIP Transfer</option>
                  <option value="MONIEPOINT_POS">Moniepoint Merchant POS</option>
                  <option value="CASH_VOUCHER">Verified Merchant Cash Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Reference / Session ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TRF-OPAY-993821"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirmation Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Paid to Shop Owner Mr. Edet; receipt photo verified"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Ledger Settlement Automation:
              </span>
              <p>
                Confirming this records an append-only entry in the double-entry ledger (debiting Escrow and crediting Merchant settlement) and sends immediate release authorization to rider Emeka.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition"
              >
                Confirm Payment & Release Pickup
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: REPORT PAYMENT FAILED */}
      {failModalOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleReportPaymentFailed}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Report Merchant Payment Failure
              </h3>
              <button
                type="button"
                onClick={() => setFailModalOrder(null)}
                className="text-slate-400 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Payment Failure *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Bank network timeout on NIP transfer; merchant account unverified; POS declining card..."
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFailModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Log Payment Failure
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: CUSTOMER NO-REPLY TIMEOUT */}
      {noReplyOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                Customer No-Reply Policy Action
              </h3>
              <button
                type="button"
                onClick={() => setNoReplyOrder(null)}
                className="text-slate-400 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Customer has not responded to substitution/budget request within the active window for{" "}
              <strong>{noReplyOrder.orderNumber}</strong>. Choose an operational resolution:
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleNoReplyResolve("SKIP_UNAVAILABLE_PROCEED")}
                className="w-full p-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-left text-xs font-bold text-amber-950 transition"
              >
                <span>Option A: Skip Unavailable Items & Proceed</span>
                <p className="text-[11px] font-normal text-amber-800 mt-0.5">
                  Rider only procures verified in-stock items. Unspent balance is automatically refunded upon delivery.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleNoReplyResolve("CANCEL_AND_REFUND")}
                className="w-full p-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-left text-xs font-bold text-red-950 transition"
              >
                <span>Option B: Cancel Order & Full Refund</span>
                <p className="text-[11px] font-normal text-red-800 mt-0.5">
                  Cancel entire purchase. Full authorization hold is returned to customer wallet.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RECONCILE AND COMPLETE */}
      {reconcileOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleReconcileOrder}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="h-5 w-5 text-amber-600" />
                Reconcile Delivered Shop for Me Order
              </h3>
              <button
                type="button"
                onClick={() => setReconcileOrder(null)}
                className="text-slate-400 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p>
                <strong>Order:</strong> {reconcileOrder.orderNumber}
              </p>
              <p>
                <strong>Initial Escrow Hold:</strong> ₦
                {((reconcileOrder.shopForMeDetails?.goodsBudgetKobo || 0) / 100).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Final Confirmed Receipt Amount (₦) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-500">₦</span>
                <input
                  type="number"
                  required
                  min={0}
                  value={actualSpentNaira}
                  onChange={(e) => setActualSpentNaira(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                If actual &lt; initial hold, the difference is credited back to customer wallet.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReconcileOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold"
              >
                Execute Reconciliation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: CANCELLATION & REFUND */}
      {selectedOrderForRefund && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!refundReason.trim()) return;
              startTransition(async () => {
                try {
                  await opsIssueRefundAction({
                    orderId: selectedOrderForRefund.id,
                    reason: refundReason.trim(),
                  });
                  setFeedback({
                    type: "success",
                    message: `Refund processed for ${selectedOrderForRefund.orderNumber}.`,
                  });
                  setSelectedOrderForRefund(null);
                  setRefundReason("");
                  router.refresh();
                } catch (err: any) {
                  setFeedback({ type: "error", message: err.message });
                }
              });
            }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Issue Cancellation & Customer Refund
              </h3>
              <button
                type="button"
                onClick={() => setSelectedOrderForRefund(null)}
                className="text-slate-400 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandatory Cancellation Audit Reason *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Shop was out of stock for all items; merchant closed early; customer requested cancellation..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForRefund(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Execute Full Refund
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
