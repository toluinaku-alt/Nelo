"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  KeyRound,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Receipt,
  Phone,
  Navigation,
  FileCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ServiceBadge } from "@/components/ServiceBadge";
import {
  riderAcceptOfferAction,
  riderDeclineOfferAction,
  riderUpdateDeliveryStageAction,
} from "@/lib/actions";

interface RiderPortalProps {
  rider: {
    id: string;
    fullName: string;
    employmentType: string;
    plateNumber: string | null;
    walletBalanceKobo: number;
    totalDeliveries: number;
    rating: number;
    isOnline: boolean;
  };
  pendingOffers: {
    id: string;
    deliveryId: string;
    orderNumber: string;
    serviceType: string;
    distanceKm: number;
    estimatedMinutes: number;
    riderEarningsKobo: number;
    pickupGeneralArea: string;
    dropoffGeneralArea: string;
    expiresAt: string;
  }[];
  activeDeliveries: {
    id: string;
    orderId: string;
    orderNumber: string;
    serviceType: string;
    status: string;
    riderEarningsKobo: number;
    distanceKm: number;
    estimatedDurationMinutes: number;
    pickupAddress: { name: string; address: string; phone?: string };
    dropoffAddress: { name: string; address: string; phone?: string };
    packageCategory?: string;
    goodsBudgetKobo?: number;
    spendingLimitKobo?: number;
    shopName?: string;
  }[];
  completedDeliveries: {
    id: string;
    orderNumber: string;
    serviceType: string;
    deliveredAt: string;
    earningsKobo: number;
  }[];
}

export function RiderPortalClient({
  rider,
  pendingOffers: initialOffers,
  activeDeliveries: initialActive,
  completedDeliveries,
}: RiderPortalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"offers" | "active" | "history">("offers");
  const [offers, setOffers] = useState(initialOffers);
  const [activeDeliveries, setActiveDeliveries] = useState(initialActive);

  // Modals / Input states
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [spentInputs, setSpentInputs] = useState<Record<string, number>>({});
  const [exceptionNotes, setExceptionNotes] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Accept offer (Calls atomic first-valid-acceptance dispatch)
  const handleAcceptOffer = (offerId: string) => {
    setStatusMessage(null);
    startTransition(async () => {
      try {
        const res = await riderAcceptOfferAction(offerId);
        if (res.success) {
          setStatusMessage({
            type: "success",
            text: res.message || "Delivery claimed successfully! Switched to Active Tasks.",
          });
          setActiveTab("active");
          router.refresh();
        } else {
          setStatusMessage({
            type: "error",
            text: res.message || "Offer could not be claimed.",
          });
        }
      } catch (err: any) {
        setStatusMessage({
          type: "error",
          text: err.message || "Failed to accept offer.",
        });
      }
    });
  };

  const handleDeclineOffer = (offerId: string) => {
    setStatusMessage(null);
    startTransition(async () => {
      try {
        await riderDeclineOfferAction(offerId, "Rider unavailable for this route");
        setOffers((prev) => prev.filter((o) => o.id !== offerId));
        router.refresh();
      } catch (err: any) {
        setStatusMessage({ type: "error", text: err.message });
      }
    });
  };

  const handleAdvanceStage = (
    deliveryId: string,
    nextStage: "ARRIVED_PICKUP" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED",
    serviceType: string
  ) => {
    setStatusMessage(null);

    const pin = pinInputs[deliveryId];
    const spentNaira = spentInputs[deliveryId];

    if (nextStage === "DELIVERED" && serviceType === "PACKAGE" && (!pin || pin.trim().length !== 4)) {
      setStatusMessage({
        type: "error",
        text: "Please enter the 4-digit security PIN provided by the recipient.",
      });
      return;
    }

    startTransition(async () => {
      try {
        await riderUpdateDeliveryStageAction({
          deliveryId,
          nextStage,
          securityPin: pin?.trim(),
          actualSpentKobo: spentNaira ? Math.round(spentNaira * 100) : undefined,
          proofNotes: exceptionNotes[deliveryId] || undefined,
        });

        setStatusMessage({
          type: "success",
          text: `Milestone advanced to ${nextStage}!`,
        });
        router.refresh();
      } catch (err: any) {
        setStatusMessage({
          type: "error",
          text: err.message || "Failed to advance stage.",
        });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Rider Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-md">
            <Bike className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {rider.fullName}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                {rider.employmentType}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Plate: <strong className="font-mono text-slate-200">{rider.plateNumber || "LAGOS-KJA-882-XY"}</strong> • 
              Rating: ⭐ {rider.rating.toFixed(1)} • {rider.totalDeliveries} Completed Runs
            </p>
          </div>
        </div>

        {/* Earnings & Online Status */}
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Withdrawable Balance
            </span>
            <span className="text-xl font-extrabold text-amber-400">
              ₦{(rider.walletBalanceKobo / 100).toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">
              Fleet Status
            </span>
            <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Online & Receiving
            </span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-3 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <p>{statusMessage.text}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("offers")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "offers"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>Incoming Offers</span>
          {offers.length > 0 && (
            <span className="h-5 px-1.5 rounded-full bg-slate-900 text-amber-400 font-black text-[10px] flex items-center justify-center">
              {offers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "active"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Navigation className="h-3.5 w-3.5" />
          <span>Active Runs ({activeDeliveries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "history"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Receipt className="h-3.5 w-3.5" />
          <span>Completed Payouts</span>
        </button>
      </div>

      {/* Tab 1: Dispatch Offers (Atomic First-Acceptance Safeguard) */}
      {activeTab === "offers" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-3">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <p>
              <strong>Atomic Dispatch Safeguard:</strong> The first eligible rider to accept gets the run. Customer private contacts are revealed only upon acceptance.
            </p>
          </div>

          {offers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <Bike className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                No Pending Offers in Your Zone
              </h3>
              <p className="text-xs text-slate-500">
                You are online! New delivery offers in Lagos Island / Mainland will notify you here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-white rounded-2xl p-6 border-2 border-amber-300 shadow-md space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {offer.orderNumber}
                      </span>
                      <div className="mt-0.5">
                        <ServiceBadge serviceType={offer.serviceType} />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Rider Payout
                      </span>
                      <span className="text-xl font-black text-amber-600">
                        ₦{(offer.riderEarningsKobo / 100).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Route Overview */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Pickup Zone:
                        </span>
                        <span>{offer.pickupGeneralArea}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin className="h-3.5 w-3.5 text-nelo-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Dropoff Zone:
                        </span>
                        <span>{offer.dropoffGeneralArea}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500 pt-1">
                      <span>Est: ~{offer.distanceKm} km</span>
                      <span>•</span>
                      <span>~{offer.estimatedMinutes} mins</span>
                    </div>
                  </div>

                  {/* Accept / Decline Action */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={() => handleDeclineOffer(offer.id)}
                      disabled={isPending}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAcceptOffer(offer.id)}
                      disabled={isPending}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-md disabled:opacity-50"
                    >
                      Accept Run (₦{(offer.riderEarningsKobo / 100).toLocaleString()})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Active Deliveries & Stage Progression */}
      {activeTab === "active" && (
        <div className="space-y-6">
          {activeDeliveries.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                No Active Delivery In Progress
              </h3>
              <p className="text-xs text-slate-500">
                Accept a delivery from the Offers tab to start navigating and collecting handoff PINs.
              </p>
            </div>
          ) : (
            activeDeliveries.map((del) => (
              <div
                key={del.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-slate-900">
                        {del.orderNumber}
                      </span>
                      <ServiceBadge serviceType={del.serviceType} />
                      <StatusBadge status={del.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Distance: ~{del.distanceKm} km • Est: {del.estimatedDurationMinutes} mins
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Rider Earnings
                    </span>
                    <span className="text-xl font-black text-emerald-600">
                      ₦{(del.riderEarningsKobo / 100).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Pickup & Dropoff Specifics (Revealed now that rider accepted) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        1. Pickup Point
                      </span>
                      {del.pickupAddress.phone && (
                        <a
                          href={`tel:${del.pickupAddress.phone}`}
                          className="text-nelo-600 font-bold inline-flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" /> Call
                        </a>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 text-sm">
                      {del.pickupAddress.name}
                    </p>
                    <p className="text-slate-600">{del.pickupAddress.address}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        2. Destination Drop-off
                      </span>
                      {del.dropoffAddress.phone && (
                        <a
                          href={`tel:${del.dropoffAddress.phone}`}
                          className="text-nelo-600 font-bold inline-flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" /> Call
                        </a>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 text-sm">
                      {del.dropoffAddress.name}
                    </p>
                    <p className="text-slate-600">{del.dropoffAddress.address}</p>
                  </div>
                </div>

                {/* Shop for Me: Actual Goods Spending Input */}
                {del.serviceType === "SHOP_FOR_ME" && (
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <FileCheck className="h-4 w-4 text-amber-700" />
                        Procurement Reconciliation (Escrow Accounting)
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-600">
                        Budget: ₦{((del.goodsBudgetKobo || 0) / 100).toLocaleString()} (Cap: ₦{((del.spendingLimitKobo || 0) / 100).toLocaleString()})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">
                          ₦
                        </span>
                        <input
                          type="number"
                          placeholder="Actual total spent at market..."
                          value={spentInputs[del.id] || ""}
                          onChange={(e) =>
                            setSpentInputs({
                              ...spentInputs,
                              [del.id]: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full pl-8 pr-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Remaining balance will return to customer wallet.
                      </span>
                    </div>
                  </div>
                )}

                {/* Package Courier: Recipient PIN Verification Prompt */}
                {del.serviceType === "PACKAGE" && (
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <KeyRound className="h-4 w-4 text-blue-700" />
                        Recipient Handoff Security PIN Check
                      </h4>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                        Mandatory
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="Enter 4-digit PIN..."
                        value={pinInputs[del.id] || ""}
                        onChange={(e) =>
                          setPinInputs({ ...pinInputs, [del.id]: e.target.value })
                        }
                        className="w-40 px-3 py-2 text-center text-sm font-mono font-black tracking-widest rounded-lg border border-blue-300 bg-white"
                      />
                      <span className="text-[11px] text-slate-600">
                        Ask recipient for the 4-digit code sent to their phone before giving them the parcel.
                      </span>
                    </div>
                  </div>
                )}

                {/* Milestone Progression Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleAdvanceStage(del.id, "ARRIVED_PICKUP", del.serviceType)}
                    disabled={isPending}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition disabled:opacity-50"
                  >
                    1. Arrived at Pickup
                  </button>

                  <button
                    onClick={() => handleAdvanceStage(del.id, "PICKED_UP", del.serviceType)}
                    disabled={isPending}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition disabled:opacity-50"
                  >
                    2. Items Picked Up
                  </button>

                  <button
                    onClick={() => handleAdvanceStage(del.id, "IN_TRANSIT", del.serviceType)}
                    disabled={isPending}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition disabled:opacity-50"
                  >
                    3. On the Way (In Transit)
                  </button>

                  <button
                    onClick={() => handleAdvanceStage(del.id, "DELIVERED", del.serviceType)}
                    disabled={isPending}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    4. Complete Delivery
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Completed Deliveries */}
      {activeTab === "history" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Delivery History & Minor Unit Ledger Settlements
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {completedDeliveries.map((cd) => (
              <div key={cd.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-900">
                    {cd.orderNumber}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-slate-500">
                    <ServiceBadge serviceType={cd.serviceType} />
                    <span>{new Date(cd.deliveredAt).toLocaleDateString("en-NG")}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-emerald-700 block text-sm">
                    +₦{(cd.earningsKobo / 100).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">
                    Paid to Rider Wallet
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
