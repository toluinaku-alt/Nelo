"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  ShoppingBag,
  Lock,
  Unlock,
  MessageSquare,
  CreditCard,
  X,
  Check,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ServiceBadge } from "@/components/ServiceBadge";
import {
  riderAcceptOfferAction,
  riderDeclineOfferAction,
  riderUpdateDeliveryStageAction,
  riderArriveAtShopAction,
  riderSubmitShopQuoteAction,
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
      pickupLocked: boolean;
      customerApprovalStatus: string;
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
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Shop for Me Quote Submission Modal State
  const [quoteModalDelivery, setQuoteModalDelivery] = useState<any | null>(null);
  const [quoteTotalNaira, setQuoteTotalNaira] = useState<number>(0);
  const [itemsForm, setItemsForm] = useState<
    {
      id: string;
      itemName: string;
      itemStatus: "AVAILABLE" | "UNAVAILABLE" | "SUBSTITUTED";
      actualPriceNaira: number;
      proposedSubName: string;
      proposedSubPriceNaira: number;
      proposedSubNotes: string;
    }[]
  >([]);

  // Accept offer
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
          text: err.message || "Network error claiming offer.",
        });
      }
    });
  };

  // Decline offer
  const handleDeclineOffer = (offerId: string) => {
    startTransition(async () => {
      try {
        await riderDeclineOfferAction(offerId);
        setOffers((prev) => prev.filter((o) => o.id !== offerId));
      } catch (err) {}
    });
  };

  // Arrive at Shop action for Shop for Me
  const handleArriveAtShop = (orderId: string) => {
    startTransition(async () => {
      try {
        await riderArriveAtShopAction(orderId);
        setStatusMessage({
          type: "success",
          text: "Status updated: Arrived at Shop. You can now prepare your in-store quote.",
        });
        router.refresh();
      } catch (err: any) {
        setStatusMessage({ type: "error", text: err.message });
      }
    });
  };

  // Open Quote Modal
  const openQuoteModal = (del: any) => {
    setQuoteModalDelivery(del);
    const existingItems = del.shopForMeDetails?.items || [];
    setItemsForm(
      existingItems.map((it: any) => ({
        id: it.id,
        itemName: it.itemName,
        itemStatus: (it.itemStatus as any) || "AVAILABLE",
        actualPriceNaira: it.actualPriceKobo ? it.actualPriceKobo / 100 : 0,
        proposedSubName: it.proposedSubName || "",
        proposedSubPriceNaira: it.proposedSubPriceKobo ? it.proposedSubPriceKobo / 100 : 0,
        proposedSubNotes: it.proposedSubNotes || "",
      }))
    );
    const initialQuote =
      del.shopForMeDetails?.shopQuoteKobo || del.shopForMeDetails?.goodsBudgetKobo || 0;
    setQuoteTotalNaira(initialQuote / 100);
  };

  // Submit Quote Modal
  const handleSubmitShopQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteModalDelivery) return;

    if (quoteTotalNaira <= 0) {
      alert("Please enter a valid in-store total.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await riderSubmitShopQuoteAction({
          orderId: quoteModalDelivery.orderId,
          shopQuoteKobo: Math.round(quoteTotalNaira * 100),
          itemsUpdates: itemsForm.map((it) => ({
            id: it.id,
            itemStatus: it.itemStatus,
            actualPriceKobo: Math.round(it.actualPriceNaira * 100),
            proposedSubName: it.proposedSubName.trim() || undefined,
            proposedSubPriceKobo: Math.round(it.proposedSubPriceNaira * 100) || undefined,
            proposedSubNotes: it.proposedSubNotes.trim() || undefined,
          })),
        });

        setStatusMessage({
          type: "success",
          text: res.requiresCustomerApproval
            ? "Quote submitted. Customer approval requested for substitutions / price changes."
            : "Quote submitted. Awaiting Admin merchant transfer.",
        });
        setQuoteModalDelivery(null);
        router.refresh();
      } catch (err: any) {
        setStatusMessage({ type: "error", text: err.message });
      }
    });
  };

  // Stage Progression
  const handleAdvanceStage = (
    deliveryId: string,
    nextStage: "ARRIVED_PICKUP" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED",
    serviceType: string,
    del: any
  ) => {
    // Zero-advance check: Cannot mark PICKED_UP for Shop for Me if pickup is locked!
    if (
      serviceType === "SHOP_FOR_ME" &&
      nextStage === "PICKED_UP" &&
      del.shopForMeDetails?.pickupLocked
    ) {
      setStatusMessage({
        type: "error",
        text: "🔒 Pickup is LOCKED! Admin has not confirmed payment to the merchant yet. Do not advance cash or collect items until Admin unlocks pickup.",
      });
      return;
    }

    const pin = pinInputs[deliveryId];
    if (nextStage === "DELIVERED" && serviceType === "PACKAGE" && (!pin || pin.length < 4)) {
      setStatusMessage({
        type: "error",
        text: "Recipient 4-digit security PIN is required to complete parcel handoff.",
      });
      return;
    }

    const actualSpentKobo = spentInputs[deliveryId]
      ? Math.round(spentInputs[deliveryId] * 100)
      : undefined;

    setStatusMessage(null);
    startTransition(async () => {
      try {
        await riderUpdateDeliveryStageAction({
          deliveryId,
          nextStage,
          securityPin: pin,
          actualSpentKobo,
        });

        setStatusMessage({
          type: "success",
          text: `Milestone advanced to ${nextStage.replace("_", " ")}!`,
        });
        router.refresh();
      } catch (err: any) {
        setStatusMessage({
          type: "error",
          text: err.message || "Failed to update delivery stage.",
        });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 w-full min-w-0 overflow-x-hidden">
      {/* Rider Header */}
      <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
            <Bike className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black">{rider.fullName}</h1>
            <p className="text-xs text-slate-400">
              Plate: <span className="font-mono text-amber-300 font-bold">{rider.plateNumber || "CAL-RDR-01"}</span> •{" "}
              {rider.employmentType.replace("_", " ")} • Calabar Pilot Fleet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <div className="flex-1 sm:flex-initial p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Wallet</span>
            <span className="text-sm font-black text-emerald-400">
              ₦{(rider.walletBalanceKobo / 100).toLocaleString()}
            </span>
          </div>
          <div className="flex-1 sm:flex-initial p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Completed</span>
            <span className="text-sm font-black text-amber-400">{rider.totalDeliveries} runs</span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-2.5 shadow-sm ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-900 border border-red-200"
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
          <span>Available Offers ({offers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "active"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>Active Tasks ({activeDeliveries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "history"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>History ({completedDeliveries.length})</span>
        </button>
      </div>

      {/* Tab 1: Offers */}
      {activeTab === "offers" && (
        <div className="space-y-4">
          {offers.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-xs text-slate-500 space-y-2">
              <Bike className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-800">No Pending Offers in Calabar Zone</p>
              <p>You are online and will receive new dispatch offers automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-white rounded-2xl p-5 border-2 border-amber-300 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start pb-2 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-500">{offer.orderNumber}</span>
                      <div className="mt-1">
                        <ServiceBadge serviceType={offer.serviceType} />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Payout</span>
                      <span className="text-lg font-black text-amber-600">
                        ₦{(offer.riderEarningsKobo / 100).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p>
                      <strong>Pickup:</strong> {offer.pickupGeneralArea}
                    </p>
                    <p>
                      <strong>Dropoff:</strong> {offer.dropoffGeneralArea}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      ~{offer.distanceKm} km • ~{offer.estimatedMinutes} mins
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleDeclineOffer(offer.id)}
                      disabled={isPending}
                      className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAcceptOffer(offer.id)}
                      disabled={isPending}
                      className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs"
                    >
                      Accept Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Active Deliveries */}
      {activeTab === "active" && (
        <div className="space-y-4">
          {activeDeliveries.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-xs text-slate-500 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-800">No Active Tasks</p>
              <p>Accept an offer from the Available Offers tab to get started.</p>
            </div>
          ) : (
            activeDeliveries.map((del) => {
              const sfm = del.shopForMeDetails;
              const isLocked = sfm?.pickupLocked;

              return (
                <div
                  key={del.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm text-slate-900">
                        {del.orderNumber}
                      </span>
                      <ServiceBadge serviceType={del.serviceType} />
                      <StatusBadge status={del.status} />
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Rider Earning
                      </span>
                      <span className="text-base font-black text-emerald-600">
                        ₦{(del.riderEarningsKobo / 100).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Route & Stop Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Stop 1: Shop / Market
                      </span>
                      <p className="font-bold text-slate-900">{del.pickupAddress.name}</p>
                      <p className="text-slate-500 text-[11px]">{del.pickupAddress.address}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Stop 2: Customer Destination
                      </span>
                      <p className="font-bold text-slate-900">{del.dropoffAddress.name}</p>
                      <p className="text-slate-500 text-[11px]">{del.dropoffAddress.address}</p>
                    </div>
                  </div>

                  {/* SHOP FOR ME PILOT CONTROLS */}
                  {del.serviceType === "SHOP_FOR_ME" && sfm && (
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <ShoppingBag className="h-4 w-4 text-amber-700" />
                          Shop for Me In-Store Protocol
                        </span>
                        <Link
                          href={`/orders/${del.orderId}`}
                          className="font-bold text-amber-800 hover:underline flex items-center gap-1"
                        >
                          <MessageSquare className="h-3 w-3" /> Chat with Admin & Customer
                        </Link>
                      </div>

                      {/* Payment Lock Warning Banner */}
                      {isLocked ? (
                        <div className="p-3 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 flex items-start gap-2">
                          <Lock className="h-4 w-4 text-amber-800 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">
                              Pickup Locked: Do NOT advance personal funds or collect goods yet
                            </p>
                            <p className="text-[11px] text-amber-800 mt-0.5 leading-normal">
                              Submit your in-store quote below. Nelo Admin will transfer payment directly to the merchant. Pickup will unlock automatically once confirmed.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-950 flex items-start gap-2">
                          <Unlock className="h-4 w-4 text-emerald-800 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">
                              Pickup Released! Confirmed paid by Admin (Ref: {sfm.shopPaymentRef || "TRF-CONFIRMED"})
                            </p>
                            <p className="text-[11px] text-emerald-800 mt-0.5">
                              Merchant has received funds. Collect the items and proceed to deliver to customer.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Workflow Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {sfm.stage === "ASSIGNED" && (
                          <button
                            type="button"
                            onClick={() => handleArriveAtShop(del.orderId)}
                            disabled={isPending}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition"
                          >
                            Step 1: Mark Arrived at Shop
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openQuoteModal(del)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-950 hover:bg-amber-50 font-bold transition shadow-2xs"
                        >
                          Step 2: Submit In-Store Quote & Check Items
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Standard Milestone Progression Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                    <button
                      onClick={() => handleAdvanceStage(del.id, "ARRIVED_PICKUP", del.serviceType, del)}
                      disabled={isPending}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition"
                    >
                      1. Arrived at Pickup
                    </button>

                    <button
                      onClick={() => handleAdvanceStage(del.id, "PICKED_UP", del.serviceType, del)}
                      disabled={isPending}
                      className={`px-3 py-2 rounded-xl font-bold transition ${
                        isLocked
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                      }`}
                      title={isLocked ? "Pickup locked until merchant is paid" : "Items in hand"}
                    >
                      2. Items Picked Up {isLocked && "(Locked)"}
                    </button>

                    <button
                      onClick={() => handleAdvanceStage(del.id, "IN_TRANSIT", del.serviceType, del)}
                      disabled={isPending}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition"
                    >
                      3. On the Way (In Transit)
                    </button>

                    <button
                      onClick={() => handleAdvanceStage(del.id, "DELIVERED", del.serviceType, del)}
                      disabled={isPending}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold transition shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>4. Complete Delivery</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: History */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs">
          <h3 className="font-bold text-slate-900">Completed Calabar Runs</h3>
          <div className="divide-y divide-slate-100">
            {completedDeliveries.map((cd) => (
              <div key={cd.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-800">{cd.orderNumber}</span>
                  <span className="text-slate-400 ml-2">
                    {new Date(cd.deliveredAt).toLocaleDateString()}
                  </span>
                </div>
                <span className="font-bold text-emerald-600">
                  ₦{(cd.earningsKobo / 100).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT IN-STORE QUOTE & CHECK ITEMS */}
      {quoteModalDelivery && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitShopQuote}
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-600" />
                Submit In-Store Quote & Checks
              </h3>
              <button
                type="button"
                onClick={() => setQuoteModalDelivery(null)}
                className="text-slate-400 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
              <p>
                <strong>Shop:</strong> {quoteModalDelivery.shopName}
              </p>
              <p>
                <strong>Customer Approved Ceiling:</strong> ₦
                {((quoteModalDelivery.spendingLimitKobo || 0) / 100).toLocaleString()}
              </p>
              <p className="text-[11px] text-amber-800">
                Any total above the ceiling or containing substitutions automatically triggers customer approval.
              </p>
            </div>

            {/* Item checks */}
            <div className="space-y-3">
              <span className="font-bold text-slate-800 block">Check Each Item on List:</span>
              {itemsForm.map((item, idx) => (
                <div key={item.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{item.itemName}</span>
                    <select
                      value={item.itemStatus}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setItemsForm((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, itemStatus: val } : i))
                        );
                      }}
                      className="text-xs rounded-lg border border-slate-300 px-2 py-1 bg-white font-semibold"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="SUBSTITUTED">Propose Substitute</option>
                      <option value="UNAVAILABLE">Out of Stock</option>
                    </select>
                  </div>

                  {item.itemStatus === "SUBSTITUTED" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Proposed substitute name..."
                        value={item.proposedSubName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItemsForm((prev) =>
                            prev.map((i) => (i.id === item.id ? { ...i, proposedSubName: val } : i))
                          );
                        }}
                        className="rounded-lg border border-slate-300 p-2 bg-white"
                      />
                      <input
                        type="number"
                        placeholder="Substitute price (₦)..."
                        value={item.proposedSubPriceNaira || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setItemsForm((prev) =>
                            prev.map((i) =>
                              i.id === item.id ? { ...i, proposedSubPriceNaira: val } : i
                            )
                          );
                        }}
                        className="rounded-lg border border-slate-300 p-2 bg-white"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total In-store quote */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Shop's Confirmed Total Quote (₦) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-500">₦</span>
                <input
                  type="number"
                  required
                  min={100}
                  value={quoteTotalNaira}
                  onChange={(e) => setQuoteTotalNaira(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuoteModalDelivery(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs"
              >
                Submit Quote
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
