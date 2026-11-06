"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ServiceBadge } from "@/components/ServiceBadge";
import { MapMock } from "@/components/MapMock";
import { opsReassignDeliveryAction, opsIssueRefundAction } from "@/lib/actions";

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
    "board" | "map" | "reassign" | "finance" | "audit"
  >("board");

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

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filtered Orders
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

  const handleReassignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelivery) return;
    if (auditReason.trim().length < 5) {
      setFeedback({
        type: "error",
        message: "Mandatory audit reason must be at least 5 characters.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const res = await opsReassignDeliveryAction({
          deliveryId: selectedDelivery.id,
          newRiderId: targetRiderId,
          reason: auditReason,
        });

        if (res.success) {
          setFeedback({
            type: "success",
            message: res.message || "Rider reassigned successfully with audit log entry.",
          });
          setSelectedDelivery(null);
          setAuditReason("");
          router.refresh();
        }
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
    });
  };

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForRefund) return;
    if (refundReason.trim().length < 5) {
      setFeedback({
        type: "error",
        message: "A clear audit reason is required to issue a customer refund.",
      });
      return;
    }

    startTransition(async () => {
      try {
        await opsIssueRefundAction({
          orderId: selectedOrderForRefund.id,
          reason: refundReason,
        });

        setFeedback({
          type: "success",
          message: `Compensating refund issued for ${selectedOrderForRefund.orderNumber}. Double-entry ledger adjusted.`,
        });
        setSelectedOrderForRefund(null);
        setRefundReason("");
        router.refresh();
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Staff Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Nelo Central Operations
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-400/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                Staff Only
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active Operator: <strong className="text-slate-200">{currentStaff.fullName}</strong> ({currentStaff.role}) • 
              Nigeria Logistics Network (Lagos & Abuja)
            </p>
          </div>
        </div>

        {/* Fleet Metrics */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Active Orders
            </span>
            <span className="text-lg font-black text-emerald-400">
              {orders.filter((o) => !["DELIVERED", "CANCELLED", "REFUNDED"].includes(o.status)).length}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Riders Online
            </span>
            <span className="text-lg font-black text-amber-400">
              {riders.filter((r) => r.isOnline).length} / {riders.length}
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
          onClick={() => setActiveTab("board")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "board"
              ? "bg-slate-900 text-emerald-400 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          <span>Dispatch Order Board ({filteredOrders.length})</span>
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
          <span>Internal Fleet Map</span>
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
          <span>Double-Entry Ledger Audit</span>
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
          <span>Privileged Audit Log ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Dispatch Board */}
      {activeTab === "board" && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
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

          {/* Orders Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Order Ref</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Zone</th>
                    <th className="px-4 py-3">Assigned Rider</th>
                    <th className="px-4 py-3 text-right">Amount (₦)</th>
                    <th className="px-5 py-3 text-right">Staff Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">
                        {ord.orderNumber}
                      </td>
                      <td className="px-4 py-3">
                        <ServiceBadge serviceType={ord.serviceType} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ord.status} />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {ord.customerName}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {ord.zoneName}
                      </td>
                      <td className="px-4 py-3">
                        {ord.delivery?.riderName ? (
                          <span className="font-semibold text-slate-800">
                            {ord.delivery.riderName} ({ord.delivery.riderPlate || "Bike"})
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold italic">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                        ₦{(ord.totalAmountKobo / 100).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right space-x-2">
                        {ord.delivery && (
                          <button
                            onClick={() => setSelectedDelivery(ord.delivery)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition"
                          >
                            Reassign
                          </button>
                        )}
                        {ord.status !== "REFUNDED" && (
                          <button
                            onClick={() => setSelectedOrderForRefund(ord)}
                            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] transition"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Internal Delivery Map */}
      {activeTab === "map" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Live Fleet & Delivery Operations Map
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff view showing real-time presence across Lagos Island, Victoria Island, Ikeja, and Abuja.
              </p>
            </div>
          </div>

          <MapMock
            pickup={{ name: "Yellow Chilli (VI)", address: "27 Oju Olobun Cl", latitude: 6.4281, longitude: 3.4219 }}
            dropoff={{ name: "Admiralty Way (Lekki)", address: "14 Admiralty Way", latitude: 6.4474, longitude: 3.4735 }}
            riderCoordinates={{ latitude: 6.4385, longitude: 3.4478 }}
            status="IN_TRANSIT"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            {riders.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-900">{r.fullName}</h4>
                  <p className="text-[11px] text-slate-500">{r.plateNumber || "LAGOS-RIDER"}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    r.isOnline ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {r.isOnline ? "Online" : "Offline"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Double-Entry Minor Unit Kobo Ledger Audit */}
      {activeTab === "finance" && (
        <div className="space-y-6">
          {/* Ledger Accounts Balance Overview */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-emerald-600" />
                  Double-Entry Ledger Account Balances
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Append-only immutable integer minor units (Nigerian Kobo). No mutable balance updates.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {ledgerAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1"
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                    {acc.code}
                  </span>
                  <span className="text-sm font-black text-slate-900 block truncate">
                    ₦{(acc.balanceKobo / 100).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">{acc.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ledger Journal Entries */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Recent General Journal Ledger Entries
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Debit Account</th>
                    <th className="px-4 py-2.5">Credit Account</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5 text-right">Amount (₦)</th>
                    <th className="px-4 py-2.5">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {ledgerEntries.map((le) => (
                    <tr key={le.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2 text-slate-500">
                        {new Date(le.createdAt).toLocaleDateString("en-NG")}
                      </td>
                      <td className="px-4 py-2 font-bold text-blue-700">
                        {le.debitAccount}
                      </td>
                      <td className="px-4 py-2 font-bold text-emerald-700">
                        {le.creditAccount}
                      </td>
                      <td className="px-4 py-2 font-sans text-slate-800">
                        {le.description}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-slate-900">
                        ₦{(le.amountKobo / 100).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 font-sans">
                        {le.isCompensating ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                            Compensating
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Regular</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-600" />
                Immutable Staff Audit Trail
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every sensitive operator action (reassignment, refund, status override) is immutably logged with its operator identity and mandatory rationale.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 uppercase tracking-wide">
                      {log.action}
                    </span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {log.userRole}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-semibold">{log.userName}</span>
                  </div>
                  <p className="text-slate-700 mt-1">
                    <strong>Mandatory Audit Reason:</strong> &ldquo;{log.reason}&rdquo;
                  </p>
                </div>

                <div className="text-right text-slate-400 text-[11px] shrink-0">
                  {new Date(log.createdAt).toLocaleString("en-NG", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reassignment Modal with Mandatory Audit Reason */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleReassignSubmit}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Manual Rider Reassignment
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Privileged dispatcher override. A mandatory audit explanation is recorded in the immutable audit log.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Replacement Rider:
              </label>
              <select
                value={targetRiderId}
                onChange={(e) => setTargetRiderId(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {riders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} ({r.plateNumber || "Bike"}) - {r.isOnline ? "Online" : "Offline"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandatory Audit Reason * (Min 5 chars)
              </label>
              <textarea
                required
                rows={3}
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder="e.g. Previous rider had motorcycle puncture on Lekki expressway"
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDelivery(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50"
              >
                {isPending ? "Reassigning..." : "Confirm & Log Audit"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Refund Modal */}
      {selectedOrderForRefund && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRefundSubmit}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Issue Customer Refund
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Order: <strong className="font-mono text-slate-900">{selectedOrderForRefund.orderNumber}</strong> • 
                Amount: ₦{(selectedOrderForRefund.totalAmountKobo / 100).toLocaleString()}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-red-50 text-red-900 text-xs font-medium">
              Will record compensating journal entries in double-entry ledger to adjust PLATFORM_FEES and REFUND_CLEARING.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Refund * (Min 5 chars)
              </label>
              <textarea
                required
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Vendor ran out of fresh stock after acceptance"
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForRefund(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {isPending ? "Processing..." : "Issue Refund"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
