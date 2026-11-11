"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getCurrentUser, requireRole, requireStaff } from "./auth";
import { acceptDeliveryOffer, declineDeliveryOffer, createDispatchOffers } from "./dispatch";
import { recordLedgerEntry, reconcileShopForMeLedger, recordAdminShopPaymentLedger } from "./ledger";
import { notificationAdapter } from "./adapters/notification";
import { estimateRoute } from "./adapters/maps";
import { isCalabarServiceable } from "./types";

/**
 * Switch active demo persona (Customer, Rider, Vendor Staff, Dispatcher, Support, Finance, Admin)
 */
export async function switchUserAction(email: string) {
  const cookieStore = cookies();
  cookieStore.set("nelo_active_user", email, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  revalidatePath("/");
  return { success: true, email };
}

/**
 * 1. Create Marketplace Order
 */
export async function createMarketplaceOrderAction(data: {
  vendorId: string;
  items: { catalogItemId: string; name: string; priceKobo: number; quantity: number }[];
  deliveryAddress: {
    label: string;
    streetAddress: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  vendorInstructions?: string;
  cutleryIncluded?: boolean;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" && user.role !== "ADMIN") {
    throw new Error("Only customers can place marketplace orders.");
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: data.vendorId },
    include: { zone: true },
  });
  if (!vendor) throw new Error("Vendor not found.");

  // Calculate Subtotal
  const subtotalKobo = data.items.reduce(
    (sum, item) => sum + item.priceKobo * item.quantity,
    0
  );

  // Delivery estimation from vendor to customer
  const route = estimateRoute(
    { latitude: vendor.latitude, longitude: vendor.longitude },
    { latitude: data.deliveryAddress.latitude, longitude: data.deliveryAddress.longitude },
    vendor.zone.baseFareKobo,
    vendor.zone.perKmRateKobo,
    vendor.zone.surgeMultiplier
  );

  const deliveryFeeKobo = route.fareBreakdown.totalFareKobo;
  const serviceFeeKobo = 30000; // ₦300 platform fee
  const totalAmountKobo = subtotalKobo + deliveryFeeKobo + serviceFeeKobo;

  const orderNumber = `NELO-MK-${Math.floor(1000 + Math.random() * 9000)}`;

  // Create Order in DB
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        customerId: user.id,
        serviceType: "MARKETPLACE",
        status: "PLACED",
        zoneId: vendor.zoneId,
        vendorId: vendor.id,
        subtotalKobo,
        deliveryFeeKobo,
        serviceFeeKobo,
        totalAmountKobo,
        pickupAddressJson: JSON.stringify({
          name: vendor.name,
          address: vendor.streetAddress,
          latitude: vendor.latitude,
          longitude: vendor.longitude,
        }),
        dropoffAddressJson: JSON.stringify(data.deliveryAddress),
        marketplaceDetails: {
          create: {
            vendorInstructions: data.vendorInstructions || "",
            cutleryIncluded: data.cutleryIncluded || false,
          },
        },
        items: {
          create: data.items.map((i) => ({
            catalogItemId: i.catalogItemId,
            nameSnapshot: i.name,
            priceKoboSnapshot: i.priceKobo,
            quantity: i.quantity,
          })),
        },
        payment: {
          create: {
            amountKobo: totalAmountKobo,
            channel: "CARD_PAYSTACK_MOCK",
            status: "SUCCESS",
            provider: "MOCK_PAYSTACK",
            providerRef: `MOCK-${Date.now()}`,
            paidAt: new Date(),
          },
        },
        delivery: {
          create: {
            distanceKm: route.distanceKm,
            estimatedDurationMinutes: route.estimatedDurationMinutes,
            riderEarningsKobo: Math.round(deliveryFeeKobo * 0.8), // Rider gets 80% of delivery fee
            status: "PENDING_DISPATCH",
          },
        },
        events: {
          create: {
            eventType: "ORDER_PLACED",
            actorId: user.id,
            actorRole: "CUSTOMER",
            metadataJson: JSON.stringify({
              itemsCount: data.items.length,
              totalAmountKobo,
            }),
          },
        },
      },
      include: {
        delivery: true,
      },
    });

    return newOrder;
  });

  // Record initial ledger entries
  await recordLedgerEntry({
    orderId: order.id,
    debitAccountCode: "CUSTOMER_WALLET",
    creditAccountCode: "VENDOR_PAYABLE",
    amountKobo: subtotalKobo,
    description: `Marketplace Order ${orderNumber} - Vendor Food/Grocery payment`,
    referenceType: "ORDER_PAYMENT",
  });

  await recordLedgerEntry({
    orderId: order.id,
    debitAccountCode: "CUSTOMER_WALLET",
    creditAccountCode: "PLATFORM_FEES",
    amountKobo: serviceFeeKobo + Math.round(deliveryFeeKobo * 0.2),
    description: `Marketplace Order ${orderNumber} - Platform commission & service fee`,
    referenceType: "PLATFORM_COMMISSION",
  });

  revalidatePath("/orders");
  revalidatePath("/vendor");
  return { success: true, orderNumber: order.orderNumber };
}

/**
 * 2. Create Shop for Me Order
 */
export async function createShopForMeOrderAction(data: {
  shopName: string;
  shopAddress: string;
  goodsBudgetKobo: number;
  spendingLimitKobo: number;
  substitutionPreference: string;
  items: { name: string; quantity: number; unit?: string; notes?: string; photoUrl?: string }[];
  deliveryAddress: {
    label: string;
    streetAddress: string;
    city: string;
    latitude: number;
    longitude: number;
    zoneId?: string;
  };
  notes?: string;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "CUSTOMER" && user.role !== "ADMIN")) {
    throw new Error("Only customers can place Shop for Me requests.");
  }

  // Enforce Calabar pilot boundary check
  const boundaryCheck = isCalabarServiceable(data.deliveryAddress);
  if (!boundaryCheck.serviceable) {
    throw new Error(
      boundaryCheck.reason ||
        "The selected delivery address is outside the active Calabar pilot perimeter (Calabar Municipal & Calabar South)."
    );
  }

  // Get or Create Calabar Service Zone
  const zoneId = boundaryCheck.zoneId || "zone-calabar-municipal";
  const zoneName = boundaryCheck.zoneName || "Calabar Municipal";

  let zone = await prisma.serviceZone.findUnique({
    where: { id: zoneId },
  });

  if (!zone) {
    zone = await prisma.serviceZone.create({
      data: {
        id: zoneId,
        name: zoneName,
        state: "Cross River State",
        baseFareKobo: 120000,
        perKmRateKobo: 15000,
      },
    });
  }

  // Find assigned responsible admin (Folake Daniels dispatcher/admin)
  const responsibleAdmin =
    (await prisma.user.findFirst({
      where: { role: { in: ["DISPATCHER", "ADMIN"] } },
    })) || user;

  // Find an active rider in Calabar
  const availableRider = await prisma.riderProfile.findFirst({
    include: { user: true },
  });

  const conciergeServiceFeeKobo = 100000; // ₦1,000 personal shopper service fee
  const deliveryFeeKobo = 120000; // ₦1,200 Calabar city delivery
  const totalAmountKobo = data.goodsBudgetKobo + conciergeServiceFeeKobo + deliveryFeeKobo;

  const orderNumber = `NELO-SFM-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        customerId: user.id,
        serviceType: "SHOP_FOR_ME",
        status: "ASSIGNED",
        zoneId: zone.id,
        subtotalKobo: data.goodsBudgetKobo,
        deliveryFeeKobo,
        serviceFeeKobo: conciergeServiceFeeKobo,
        totalAmountKobo,
        pickupAddressJson: JSON.stringify({
          name: data.shopName,
          address: data.shopAddress,
          latitude: 4.9650,
          longitude: 8.3300,
        }),
        dropoffAddressJson: JSON.stringify(data.deliveryAddress),
        shopForMeDetails: {
          create: {
            shopName: data.shopName,
            shopAddress: data.shopAddress,
            goodsBudgetKobo: data.goodsBudgetKobo,
            spendingLimitKobo: data.spendingLimitKobo,
            substitutionPreference: data.substitutionPreference,
            notes: data.notes || "",
            stage: "ASSIGNED",
            assignedAdminId: responsibleAdmin.id,
            assignedAdminName: responsibleAdmin.fullName || "Folake Daniels",
            pickupLocked: true,
            customerApprovalStatus: "NONE",
            items: {
              create: data.items.map((it) => ({
                itemName: it.name,
                quantity: it.quantity,
                unit: it.unit || "item",
                notes: it.notes || "",
                photoUrl: it.photoUrl || null,
                itemStatus: "PENDING",
              })),
            },
          },
        },
        payment: {
          create: {
            amountKobo: totalAmountKobo,
            channel: "CARD_PAYSTACK_MOCK",
            status: "SUCCESS",
            provider: "MOCK_PAYSTACK",
            providerRef: `MOCK-SFM-${Date.now()}`,
            paidAt: new Date(),
          },
        },
        delivery: {
          create: {
            distanceKm: 4.2,
            estimatedDurationMinutes: 35,
            riderEarningsKobo: Math.round(deliveryFeeKobo * 0.8) + 50000,
            status: "ASSIGNED",
            riderId: availableRider?.id || null,
          },
        },
        events: {
          create: [
            {
              eventType: "ORDER_PLACED",
              actorId: user.id,
              actorRole: "CUSTOMER",
              metadataJson: JSON.stringify({
                shopName: data.shopName,
                goodsBudgetKobo: data.goodsBudgetKobo,
                spendingLimitKobo: data.spendingLimitKobo,
              }),
            },
            {
              eventType: "DISPATCH_ASSIGNED",
              actorId: responsibleAdmin.id,
              actorRole: "DISPATCHER",
              metadataJson: JSON.stringify({
                responsibleAdmin: responsibleAdmin.fullName,
                assignedRider: availableRider?.user.fullName || "Emeka Obi",
              }),
            },
          ],
        },
        messages: {
          create: [
            {
              senderId: "system",
              senderRole: "ADMIN",
              senderName: "Nelo Calabar Dispatch",
              message: `Order ${orderNumber} initialized. Initial budget of ₦${(
                data.goodsBudgetKobo / 100
              ).toLocaleString()} (approved cap ₦${(
                data.spendingLimitKobo / 100
              ).toLocaleString()}) is held in Escrow. Assigned Admin: ${responsibleAdmin.fullName}; Assigned Rider: ${
                availableRider?.user.fullName || "Emeka Obi"
              }. The rider will not advance funds—Nelo pays the shop directly upon in-store confirmation.`,
            },
          ],
        },
      },
      include: {
        delivery: true,
      },
    });

    return newOrder;
  });

  // Hold goods budget in Escrow account
  await recordLedgerEntry({
    orderId: order.id,
    debitAccountCode: "CUSTOMER_WALLET",
    creditAccountCode: "ESCROW_GOODS",
    amountKobo: data.goodsBudgetKobo,
    description: `Shop-for-Me Order ${orderNumber} - Reserved items purchasing budget held in Escrow`,
    referenceType: "ORDER_PAYMENT",
  });

  revalidatePath("/orders");
  revalidatePath("/rider");
  revalidatePath("/ops");
  return { success: true, orderNumber: order.orderNumber, orderId: order.id };
}

/**
 * 2b. Rider Arrived at Shop
 */
export async function riderArriveAtShopAction(orderId: string) {
  const user = await getCurrentUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shopForMeDetails: true },
  });

  if (!order || !order.shopForMeDetails) throw new Error("Shop for Me order not found");

  await prisma.$transaction([
    prisma.shopForMeDetails.update({
      where: { orderId },
      data: { stage: "RIDER_AT_SHOP" },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { status: "RIDER_AT_SHOP" },
    }),
    prisma.orderEvent.create({
      data: {
        orderId,
        eventType: "RIDER_AT_SHOP",
        actorId: user?.id,
        actorRole: user?.role || "RIDER",
        metadataJson: JSON.stringify({
          shopName: order.shopForMeDetails.shopName,
          timestamp: new Date().toISOString(),
        }),
      },
    }),
    prisma.orderMessage.create({
      data: {
        orderId,
        senderId: user?.id || "rider",
        senderRole: "RIDER",
        senderName: user?.fullName || "Emeka Obi (Rider)",
        message: `I have arrived at ${order.shopForMeDetails.shopName}. I am checking item availability and preparing the shop quote now.`,
      },
    }),
  ]);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/rider");
  revalidatePath("/ops");
  return { success: true };
}

/**
 * 2c. Rider Submit In-Store Quote & Proposed Substitutions
 */
export async function riderSubmitShopQuoteAction(params: {
  orderId: string;
  shopQuoteKobo: number;
  itemsUpdates: {
    id: string;
    itemStatus: "AVAILABLE" | "UNAVAILABLE" | "SUBSTITUTED";
    actualPriceKobo?: number;
    proposedSubName?: string;
    proposedSubPriceKobo?: number;
    proposedSubNotes?: string;
  }[];
  riderNotes?: string;
}) {
  const user = await getCurrentUser();
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { shopForMeDetails: { include: { items: true } } },
  });

  if (!order || !order.shopForMeDetails) throw new Error("Shop for Me order not found");

  const details = order.shopForMeDetails;
  const approvedLimitKobo = details.spendingLimitKobo;

  // Check if customer approval is required:
  // 1. If total quote exceeds customer's approved limit
  // 2. OR if any item is substituted or unavailable
  const hasSubstitutions = params.itemsUpdates.some(
    (i) => i.itemStatus === "SUBSTITUTED" || i.itemStatus === "UNAVAILABLE"
  );
  const exceedsApprovedBudget = params.shopQuoteKobo > approvedLimitKobo;
  const requiresCustomerApproval = hasSubstitutions || exceedsApprovedBudget;

  const nextStage = requiresCustomerApproval
    ? "CUSTOMER_APPROVAL_PENDING"
    : "SHOP_PAYMENT_PENDING";

  // Update item records in DB
  for (const it of params.itemsUpdates) {
    await prisma.shopItem.update({
      where: { id: it.id },
      data: {
        itemStatus: it.itemStatus,
        actualPriceKobo: it.actualPriceKobo || null,
        proposedSubName: it.proposedSubName || null,
        proposedSubPriceKobo: it.proposedSubPriceKobo || null,
        proposedSubNotes: it.proposedSubNotes || null,
        isPurchased: it.itemStatus === "AVAILABLE" || it.itemStatus === "SUBSTITUTED",
      },
    });
  }

  // Update Shop for Me Details and Order status
  await prisma.$transaction([
    prisma.shopForMeDetails.update({
      where: { orderId: params.orderId },
      data: {
        shopQuoteKobo: params.shopQuoteKobo,
        stage: nextStage,
        customerApprovalRequired: requiresCustomerApproval,
        customerApprovalStatus: requiresCustomerApproval ? "PENDING" : "APPROVED",
      },
    }),
    prisma.order.update({
      where: { id: params.orderId },
      data: { status: nextStage },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: params.orderId,
        eventType: requiresCustomerApproval
          ? "QUOTE_APPROVAL_REQUIRED"
          : "QUOTE_APPROVED_AUTOMATIC",
        actorId: user?.id,
        actorRole: "RIDER",
        metadataJson: JSON.stringify({
          shopQuoteKobo: params.shopQuoteKobo,
          approvedLimitKobo,
          hasSubstitutions,
          exceedsApprovedBudget,
        }),
      },
    }),
    prisma.orderMessage.create({
      data: {
        orderId: params.orderId,
        senderId: user?.id || "rider",
        senderRole: "RIDER",
        senderName: user?.fullName || "Emeka Obi (Rider)",
        message: requiresCustomerApproval
          ? `In-store total from ${details.shopName} is ₦${(
              params.shopQuoteKobo / 100
            ).toLocaleString()}.${
              exceedsApprovedBudget
                ? ` This is ₦${(
                    (params.shopQuoteKobo - approvedLimitKobo) /
                    100
                  ).toLocaleString()} above your original limit.`
                : ""
            }${
              hasSubstitutions ? " Note: Some items have substitutions or are out of stock." : ""
            } Customer approval is required before payment can be made.`
          : `All items verified at ${details.shopName}. Total is ₦${(
              params.shopQuoteKobo / 100
            ).toLocaleString()} (within approved limit). Awaiting Admin transfer to merchant.`,
      },
    }),
  ]);

  revalidatePath(`/orders/${params.orderId}`);
  revalidatePath("/rider");
  revalidatePath("/ops");
  return { success: true, requiresCustomerApproval };
}

/**
 * 2d. Customer Approve or Reject Proposed Substitutions / Budget Increase
 */
export async function customerRespondApprovalAction(params: {
  orderId: string;
  approved: boolean;
  notes?: string;
}) {
  const user = await getCurrentUser();
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { shopForMeDetails: true },
  });

  if (!order || !order.shopForMeDetails) throw new Error("Order not found");

  const details = order.shopForMeDetails;
  const quoteKobo = details.shopQuoteKobo || details.goodsBudgetKobo;

  if (params.approved) {
    // Approved: increase spending limit to match approved quote and advance to SHOP_PAYMENT_PENDING
    await prisma.$transaction([
      prisma.shopForMeDetails.update({
        where: { orderId: params.orderId },
        data: {
          customerApprovalStatus: "APPROVED",
          customerApprovedAt: new Date(),
          spendingLimitKobo: Math.max(details.spendingLimitKobo, quoteKobo),
          stage: "SHOP_PAYMENT_PENDING",
        },
      }),
      prisma.order.update({
        where: { id: params.orderId },
        data: { status: "SHOP_PAYMENT_PENDING" },
      }),
      prisma.orderEvent.create({
        data: {
          orderId: params.orderId,
          eventType: "CUSTOMER_APPROVAL_GRANTED",
          actorId: user?.id,
          actorRole: "CUSTOMER",
          metadataJson: JSON.stringify({
            approvedQuoteKobo: quoteKobo,
            customerNotes: params.notes || "Customer approved changes",
          }),
        },
      }),
      prisma.orderMessage.create({
        data: {
          orderId: params.orderId,
          senderId: user?.id || "customer",
          senderRole: "CUSTOMER",
          senderName: user?.fullName || "Chioma Adeleke (Customer)",
          message: `Approved! I have accepted the in-store quote of ₦${(
            quoteKobo / 100
          ).toLocaleString()} and proposed substitutions. Admin may now proceed with paying the shop.`,
        },
      }),
    ]);
  } else {
    // Rejected: mark rejection and inform rider and admin
    await prisma.$transaction([
      prisma.shopForMeDetails.update({
        where: { orderId: params.orderId },
        data: {
          customerApprovalStatus: "REJECTED",
          customerApprovalReason: params.notes || "Customer declined proposed changes",
          stage: "RIDER_AT_SHOP",
        },
      }),
      prisma.order.update({
        where: { id: params.orderId },
        data: { status: "RIDER_AT_SHOP" },
      }),
      prisma.orderEvent.create({
        data: {
          orderId: params.orderId,
          eventType: "CUSTOMER_APPROVAL_REJECTED",
          actorId: user?.id,
          actorRole: "CUSTOMER",
          metadataJson: JSON.stringify({
            reason: params.notes || "Customer declined changes",
          }),
        },
      }),
      prisma.orderMessage.create({
        data: {
          orderId: params.orderId,
          senderId: user?.id || "customer",
          senderRole: "CUSTOMER",
          senderName: user?.fullName || "Chioma Adeleke (Customer)",
          message: `Approval Declined: ${
            params.notes || "Please do not proceed with the proposed price or substitute item."
          }`,
        },
      }),
    ]);
  }

  revalidatePath(`/orders/${params.orderId}`);
  revalidatePath("/rider");
  revalidatePath("/ops");
  return { success: true };
}

/**
 * 2e. Admin Pays Shop & Confirms Payment (Releases Rider Pickup)
 */
export async function adminConfirmShopPaymentAction(params: {
  orderId: string;
  amountKobo: number;
  paymentRef: string;
  paymentMethod: string;
  notes?: string;
}) {
  const staff = await requireStaff();
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { shopForMeDetails: true },
  });

  if (!order || !order.shopForMeDetails) throw new Error("Order not found");

  const details = order.shopForMeDetails;

  // Record Admin Payment in Ledger
  await recordAdminShopPaymentLedger({
    orderId: order.id,
    orderNumber: order.orderNumber,
    amountKobo: params.amountKobo,
    paymentRef: params.paymentRef,
    paymentMethod: params.paymentMethod,
  });

  // Unlock pickup and advance stage
  await prisma.$transaction([
    prisma.shopForMeDetails.update({
      where: { orderId: params.orderId },
      data: {
        shopPaymentStatus: "CONFIRMED",
        shopPaymentAmountKobo: params.amountKobo,
        shopPaymentRef: params.paymentRef,
        shopPaymentMethod: params.paymentMethod,
        shopPaidAt: new Date(),
        pickupLocked: false,
        pickupReleasedAt: new Date(),
        stage: "PICKUP_RELEASED",
      },
    }),
    prisma.order.update({
      where: { id: params.orderId },
      data: { status: "PICKUP_RELEASED" },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: params.orderId,
        eventType: "SHOP_PAYMENT_CONFIRMED",
        actorId: staff.id,
        actorRole: staff.role,
        metadataJson: JSON.stringify({
          amountKobo: params.amountKobo,
          paymentRef: params.paymentRef,
          paymentMethod: params.paymentMethod,
          confirmedBy: staff.fullName,
        }),
      },
    }),
    prisma.orderMessage.create({
      data: {
        orderId: params.orderId,
        senderId: staff.id,
        senderRole: "ADMIN",
        senderName: `${staff.fullName} (Admin / Dispatch)`,
        message: `Admin Payment Confirmed: ₦${(
          params.amountKobo / 100
        ).toLocaleString()} transferred to merchant via ${params.paymentMethod} (Ref: ${
          params.paymentRef
        }). Pickup is RELEASED! Rider, you are authorized to collect the items.`,
      },
    }),
  ]);

  revalidatePath(`/orders/${params.orderId}`);
  revalidatePath("/rider");
  revalidatePath("/ops");
  return { success: true };
}

/**
 * 2f. Admin Report Failed Payment to Shop
 */
export async function adminReportPaymentFailedAction(params: {
  orderId: string;
  reason: string;
}) {
  const staff = await requireStaff();
  const order = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!order) throw new Error("Order not found");

  await prisma.$transaction([
    prisma.shopForMeDetails.update({
      where: { orderId: params.orderId },
      data: { shopPaymentStatus: "FAILED" },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: params.orderId,
        eventType: "SHOP_PAYMENT_FAILED",
        actorId: staff.id,
        actorRole: staff.role,
        metadataJson: JSON.stringify({ reason: params.reason }),
      },
    }),
    prisma.orderMessage.create({
      data: {
        orderId: params.orderId,
        senderId: staff.id,
        senderRole: "ADMIN",
        senderName: `${staff.fullName} (Admin)`,
        message: `Payment to merchant failed: ${params.reason}. We are re-attempting via alternate bank channel. Rider, please hold.`,
      },
    }),
  ]);

  revalidatePath(`/orders/${params.orderId}`);
  revalidatePath("/ops");
  return { success: true };
}

/**
 * 2g. Admin Handle Customer No-Reply Timeout
 */
export async function adminHandleNoCustomerReplyAction(params: {
  orderId: string;
  action: "SKIP_UNAVAILABLE_PROCEED" | "CANCEL_AND_REFUND";
  notes?: string;
}) {
  const staff = await requireStaff();
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { shopForMeDetails: true },
  });

  if (!order || !order.shopForMeDetails) throw new Error("Order not found");

  if (params.action === "SKIP_UNAVAILABLE_PROCEED") {
    await prisma.$transaction([
      prisma.shopForMeDetails.update({
        where: { orderId: params.orderId },
        data: {
          customerApprovalStatus: "AUTO_SKIPPED",
          stage: "SHOP_PAYMENT_PENDING",
        },
      }),
      prisma.order.update({
        where: { id: params.orderId },
        data: { status: "SHOP_PAYMENT_PENDING" },
      }),
      prisma.orderMessage.create({
        data: {
          orderId: params.orderId,
          senderId: staff.id,
          senderRole: "ADMIN",
          senderName: `${staff.fullName} (Admin)`,
          message: `Customer did not respond within policy window. Per policy, skipping unavailable items and proceeding with verified goods.`,
        },
      }),
    ]);
  } else {
    // Cancel & Refund
    await opsIssueRefundAction({
      orderId: params.orderId,
      reason: `Order cancelled due to customer non-response and merchant item unavailability: ${
        params.notes || "Full refund processed"
      }`,
    });
  }

  revalidatePath(`/orders/${params.orderId}`);
  revalidatePath("/ops");
  return { success: true };
}

/**
 * 2h. Reconcile and Complete Shop for Me Order
 */
export async function reconcileAndCompleteShopForMeAction(params: {
  orderId: string;
  actualSpentKobo: number;
}) {
  const user = await getCurrentUser();
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { shopForMeDetails: true, delivery: true },
  });

  if (!order || !order.shopForMeDetails) throw new Error("Order not found");

  const initialBudgetKobo = order.shopForMeDetails.goodsBudgetKobo;
  const actualSpent = params.actualSpentKobo;
  const reconciledBalanceKobo = initialBudgetKobo - actualSpent; // positive = refund to customer, negative = additional collected

  // Execute double-entry ledger reconciliation
  await reconcileShopForMeLedger({
    orderId: params.orderId,
    budgetKobo: initialBudgetKobo,
    actualSpentKobo: actualSpent,
  });

  const reconciliationStatus =
    reconciledBalanceKobo > 0
      ? "REFUNDED"
      : reconciledBalanceKobo < 0
      ? "ADDITIONAL_PAID"
      : "RECONCILED";

  await prisma.$transaction([
    prisma.shopForMeDetails.update({
      where: { orderId: params.orderId },
      data: {
        actualGoodsSpentKobo: actualSpent,
        reconciledBalanceKobo,
        reconciliationStatus,
        stage: "DELIVERED",
      },
    }),
    prisma.order.update({
      where: { id: params.orderId },
      data: { status: "DELIVERED" },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: params.orderId,
        eventType: "RECONCILIATION_COMPLETED",
        actorId: user?.id,
        actorRole: user?.role || "SYSTEM",
        metadataJson: JSON.stringify({
          initialBudgetKobo,
          actualSpentKobo: actualSpent,
          reconciledBalanceKobo,
          reconciliationStatus,
        }),
      },
    }),
    prisma.orderMessage.create({
      data: {
        orderId: params.orderId,
        senderId: "system",
        senderRole: "ADMIN",
        senderName: "Nelo Reconciliation Bot",
        message:
          reconciledBalanceKobo > 0
            ? `Reconciliation complete: Initial escrow hold was ₦${(
                initialBudgetKobo / 100
              ).toLocaleString()}, actual merchant payment was ₦${(
                actualSpent / 100
              ).toLocaleString()}. Your unspent balance of ₦${(
                reconciledBalanceKobo / 100
              ).toLocaleString()} has been refunded to your wallet balance.`
            : `Reconciliation complete: Purchase matched approved budget exactly. Items successfully delivered!`,
      },
    }),
  ]);

  revalidatePath(`/orders/${params.orderId}`);
  revalidatePath("/rider");
  revalidatePath("/ops");
  return { success: true, reconciledBalanceKobo };
}

/**
 * 2i. Send Message in Order Thread (Tri-party Customer-Rider-Admin)
 */
export async function sendOrderMessageAction(params: {
  orderId: string;
  message: string;
  attachmentUrl?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Must be logged in to send a message.");

  if (!params.message || !params.message.trim()) {
    throw new Error("Message cannot be empty.");
  }

  const role = user.role === "RIDER" ? "RIDER" : user.role === "CUSTOMER" ? "CUSTOMER" : "ADMIN";

  const message = await prisma.orderMessage.create({
    data: {
      orderId: params.orderId,
      senderId: user.id,
      senderRole: role,
      senderName: user.fullName || "User",
      message: params.message.trim(),
      attachmentUrl: params.attachmentUrl || null,
    },
  });

  await prisma.orderEvent.create({
    data: {
      orderId: params.orderId,
      eventType: "MESSAGE_SENT",
      actorId: user.id,
      actorRole: role,
      metadataJson: JSON.stringify({
        senderName: user.fullName,
        messagePreview: params.message.slice(0, 40),
      }),
    },
  });

  revalidatePath(`/orders/${params.orderId}`);
  revalidatePath("/rider");
  revalidatePath("/ops");
  return { success: true, messageId: message.id };
}

/**
 * 3. Create Package Delivery Order
 */
export async function createPackageOrderAction(data: {
  pickupAddress: {
    label: string;
    streetAddress: string;
    city: string;
    contactName: string;
    contactPhone: string;
    latitude: number;
    longitude: number;
  };
  dropoffAddress: {
    label: string;
    streetAddress: string;
    city: string;
    contactName: string;
    contactPhone: string;
    latitude: number;
    longitude: number;
  };
  packageCategory: string;
  weightKg: number;
  dimensionsCm?: string;
  isFragile?: boolean;
  deliveryInstructions?: string;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" && user.role !== "ADMIN") {
    throw new Error("Only customers can request package deliveries.");
  }

  const zone = await prisma.serviceZone.findFirst() || await prisma.serviceZone.create({
    data: {
      name: "Lagos Island & Mainland",
      state: "Lagos",
      baseFareKobo: 120000,
      perKmRateKobo: 15000,
    },
  });

  const route = estimateRoute(
    { latitude: data.pickupAddress.latitude, longitude: data.pickupAddress.longitude },
    { latitude: data.dropoffAddress.latitude, longitude: data.dropoffAddress.longitude },
    zone.baseFareKobo,
    zone.perKmRateKobo
  );

  // Weight surcharge if > 5kg: ₦200 per extra kg
  const weightSurchargeKobo = data.weightKg > 5 ? Math.round((data.weightKg - 5) * 20000) : 0;
  const deliveryFeeKobo = route.fareBreakdown.totalFareKobo + weightSurchargeKobo;
  const serviceFeeKobo = 20000; // ₦200 base service
  const totalAmountKobo = deliveryFeeKobo + serviceFeeKobo;

  // Generate a random secure 4-digit PIN for drop-off verification handoff
  const securityPin = Math.floor(1000 + Math.random() * 9000).toString();
  const orderNumber = `NELO-PKG-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        customerId: user.id,
        serviceType: "PACKAGE",
        status: "AWAITING_RIDER",
        zoneId: zone.id,
        deliveryFeeKobo,
        serviceFeeKobo,
        totalAmountKobo,
        pickupAddressJson: JSON.stringify(data.pickupAddress),
        dropoffAddressJson: JSON.stringify(data.dropoffAddress),
        packageDetails: {
          create: {
            packageCategory: data.packageCategory,
            weightKg: data.weightKg,
            dimensionsCm: data.dimensionsCm || "Standard",
            recipientName: data.dropoffAddress.contactName,
            recipientPhone: data.dropoffAddress.contactPhone,
            isFragile: data.isFragile || false,
            securityPin,
            deliveryInstructions: data.deliveryInstructions || "",
          },
        },
        payment: {
          create: {
            amountKobo: totalAmountKobo,
            channel: "CARD_PAYSTACK_MOCK",
            status: "SUCCESS",
            provider: "MOCK_PAYSTACK",
            providerRef: `MOCK-PKG-${Date.now()}`,
            paidAt: new Date(),
          },
        },
        delivery: {
          create: {
            distanceKm: route.distanceKm,
            estimatedDurationMinutes: route.estimatedDurationMinutes,
            riderEarningsKobo: Math.round(deliveryFeeKobo * 0.8),
            status: "PENDING_DISPATCH",
            proofType: "PIN_AND_PHOTO",
          },
        },
        events: {
          create: {
            eventType: "ORDER_PLACED",
            actorId: user.id,
            actorRole: "CUSTOMER",
            metadataJson: JSON.stringify({
              packageCategory: data.packageCategory,
              weightKg: data.weightKg,
            }),
          },
        },
      },
      include: {
        delivery: true,
      },
    });

    return newOrder;
  });

  // Hold courier delivery fee
  await recordLedgerEntry({
    orderId: order.id,
    debitAccountCode: "CUSTOMER_WALLET",
    creditAccountCode: "PLATFORM_FEES",
    amountKobo: totalAmountKobo,
    description: `Package Courier ${orderNumber} - Delivery Fee & Service margin`,
    referenceType: "ORDER_PAYMENT",
  });

  if (order.delivery) {
    await createDispatchOffers(order.delivery.id);
  }

  revalidatePath("/orders");
  revalidatePath("/rider");
  return { success: true, orderNumber: order.orderNumber, securityPin };
}

/**
 * 4. Vendor Staff Action: Accept, Decline, or mark Prepped
 */
export async function vendorUpdateOrderStatusAction(
  orderId: string,
  newStatus: "VENDOR_ACCEPTED" | "DECLINED" | "AWAITING_RIDER"
) {
  const user = await getCurrentUser();
  if (!user || (!user.vendorStaff?.length && user.role !== "ADMIN")) {
    throw new Error("Unauthorized: Only vendor staff can update store orders.");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { delivery: true },
  });
  if (!order) throw new Error("Order not found");

  await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });

  await prisma.orderEvent.create({
    data: {
      orderId,
      eventType: `VENDOR_${newStatus}`,
      actorId: user.id,
      actorRole: user.role,
      metadataJson: JSON.stringify({ updatedTo: newStatus }),
    },
  });

  // If vendor accepted/prepped, broadcast offers to nearby riders!
  if (newStatus === "AWAITING_RIDER" && order.delivery) {
    await createDispatchOffers(order.delivery.id);
  }

  revalidatePath("/vendor");
  revalidatePath("/orders");
  revalidatePath("/rider");
  return { success: true };
}

/**
 * 5. Rider Accept Offer (Atomic with double-assignment prevention)
 */
export async function riderAcceptOfferAction(offerId: string) {
  const user = await getCurrentUser();
  if (!user || (!user.riderProfile && user.role !== "ADMIN")) {
    throw new Error("Only registered riders can accept delivery offers.");
  }

  const riderId = user.riderProfile?.id || (await prisma.riderProfile.findFirst())?.id;
  if (!riderId) throw new Error("No rider profile active");

  const result = await acceptDeliveryOffer(offerId, riderId);
  revalidatePath("/rider");
  revalidatePath("/orders");
  revalidatePath("/ops");
  return result;
}

/**
 * 6. Rider Decline Offer
 */
export async function riderDeclineOfferAction(offerId: string, reason?: string) {
  const user = await getCurrentUser();
  const riderId = user.riderProfile?.id || (await prisma.riderProfile.findFirst())?.id;
  if (!riderId) throw new Error("No rider profile active");

  await declineDeliveryOffer(offerId, riderId, reason);
  revalidatePath("/rider");
  return { success: true };
}

/**
 * 7. Rider Lifecycle Stage Progression
 */
export async function riderUpdateDeliveryStageAction(params: {
  deliveryId: string;
  nextStage: "ARRIVED_PICKUP" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED";
  securityPin?: string;
  actualSpentKobo?: number;
  proofNotes?: string;
}) {
  const user = await getCurrentUser();
  if (!user || (!user.riderProfile && user.role !== "ADMIN")) {
    throw new Error("Only riders can advance delivery status.");
  }

  const delivery = await prisma.delivery.findUnique({
    where: { id: params.deliveryId },
    include: {
      order: {
        include: {
          packageDetails: true,
          shopForMeDetails: true,
        },
      },
    },
  });

  if (!delivery) throw new Error("Delivery record not found");

  // Validate Security PIN for Package Delivery if attempting to mark DELIVERED
  if (params.nextStage === "DELIVERED" && delivery.order.serviceType === "PACKAGE") {
    const expectedPin = delivery.order.packageDetails?.securityPin;
    if (expectedPin && expectedPin !== params.securityPin?.trim()) {
      throw new Error(`Invalid Delivery PIN! The recipient must provide the matching 4-digit handoff PIN.`);
    }
  }

  // Handle Shop for Me actual spending reconciliation
  if (delivery.order.serviceType === "SHOP_FOR_ME" && params.actualSpentKobo !== undefined) {
    await prisma.shopForMeDetails.update({
      where: { orderId: delivery.order.id },
      data: {
        actualGoodsSpentKobo: params.actualSpentKobo,
        reconciliationStatus: "RECONCILED",
      },
    });

    const budgetKobo = delivery.order.shopForMeDetails?.goodsBudgetKobo || 0;
    await reconcileShopForMeLedger({
      orderId: delivery.order.id,
      budgetKobo,
      actualSpentKobo: params.actualSpentKobo,
    });
  }

  const now = new Date();
  const updateOrderData: any = {
    status: params.nextStage === "DELIVERED" ? "DELIVERED" : params.nextStage,
  };

  const updateDeliveryData: any = {
    status: params.nextStage,
    proofNotes: params.proofNotes || delivery.proofNotes,
  };

  if (params.nextStage === "PICKED_UP") {
    updateDeliveryData.pickupTime = now;
  }
  if (params.nextStage === "DELIVERED") {
    updateDeliveryData.deliveryTime = now;
    if (params.securityPin) {
      updateDeliveryData.verifiedPin = params.securityPin;
    }

    // Credit Rider Payable account for delivery completion!
    await recordLedgerEntry({
      orderId: delivery.order.id,
      debitAccountCode: "PLATFORM_FEES",
      creditAccountCode: "RIDER_PAYABLE",
      amountKobo: delivery.riderEarningsKobo,
      description: `Delivery payout credit for rider on Order ${delivery.order.orderNumber}`,
      referenceType: "RIDER_EARNING",
    });

    // Increment rider total deliveries
    if (delivery.riderId) {
      await prisma.riderProfile.update({
        where: { id: delivery.riderId },
        data: {
          totalDeliveries: { increment: 1 },
          walletBalanceKobo: { increment: delivery.riderEarningsKobo },
        },
      });
    }
  }

  await prisma.$transaction([
    prisma.delivery.update({
      where: { id: delivery.id },
      data: updateDeliveryData,
    }),
    prisma.order.update({
      where: { id: delivery.order.id },
      data: updateOrderData,
    }),
    prisma.orderEvent.create({
      data: {
        orderId: delivery.order.id,
        eventType: `STAGE_${params.nextStage}`,
        actorId: user.id,
        actorRole: user.role,
        metadataJson: JSON.stringify({
          updatedAt: now.toISOString(),
          stage: params.nextStage,
        }),
      },
    }),
  ]);

  revalidatePath("/rider");
  revalidatePath("/orders");
  revalidatePath(`/track/${delivery.order.orderNumber}`);
  revalidatePath("/ops");
  return { success: true };
}

/**
 * 8. Operations Staff Action: Manual Reassign Rider (Mandatory Audit Reason)
 */
export async function opsReassignDeliveryAction(data: {
  deliveryId: string;
  newRiderId: string;
  reason: string;
}) {
  const staff = await requireStaff();

  if (!data.reason || data.reason.trim().length < 5) {
    throw new Error("A valid audit explanation (minimum 5 characters) is required to reassign a rider.");
  }

  const delivery = await prisma.delivery.findUnique({
    where: { id: data.deliveryId },
    include: { order: true },
  });

  if (!delivery) throw new Error("Delivery not found");

  const newRider = await prisma.riderProfile.findUnique({
    where: { id: data.newRiderId },
    include: { user: true },
  });

  if (!newRider) throw new Error("Target rider not found");

  await prisma.$transaction([
    prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        riderId: newRider.id,
        status: "ACCEPTED",
        dispatcherNote: `Manually reassigned by ${staff.fullName}: ${data.reason}`,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: staff.id,
        userRole: staff.role,
        action: "ORDER_REASSIGN",
        targetResource: "Delivery",
        targetId: delivery.id,
        reason: data.reason,
        metadataJson: JSON.stringify({
          orderNumber: delivery.order.orderNumber,
          previousRiderId: delivery.riderId,
          newRiderId: newRider.id,
          reassignedBy: staff.fullName,
        }),
      },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: delivery.order.id,
        eventType: "DISPATCHER_REASSIGNED",
        actorId: staff.id,
        actorRole: staff.role,
        metadataJson: JSON.stringify({
          reason: data.reason,
          newRider: newRider.user.fullName,
        }),
      },
    }),
  ]);

  revalidatePath("/ops/dispatch");
  revalidatePath("/ops/audit");
  revalidatePath("/rider");
  return { success: true, message: `Reassigned successfully to ${newRider.user.fullName}` };
}

/**
 * 9. Operations Staff Action: Issue Customer Refund (Double-entry compensating ledger)
 */
export async function opsIssueRefundAction(data: {
  orderId: string;
  reason: string;
  amountKobo?: number;
}) {
  const staff = await requireStaff();

  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
  });
  if (!order) throw new Error("Order not found");

  const refundKobo = data.amountKobo || order.totalAmountKobo;

  await recordLedgerEntry({
    orderId: order.id,
    debitAccountCode: "PLATFORM_FEES",
    creditAccountCode: "REFUND_CLEARING",
    amountKobo: refundKobo,
    description: `Compensating customer refund issued by ${staff.fullName}: ${data.reason}`,
    referenceType: "CUSTOMER_REFUND",
    isCompensating: true,
  });

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: "REFUNDED", cancellationReason: data.reason },
    }),
    prisma.auditLog.create({
      data: {
        userId: staff.id,
        userRole: staff.role,
        action: "REFUND_ISSUED",
        targetResource: "Order",
        targetId: order.id,
        reason: data.reason,
        metadataJson: JSON.stringify({
          refundKobo,
          staffRole: staff.role,
        }),
      },
    }),
  ]);

  revalidatePath("/ops/finance");
  revalidatePath("/ops/audit");
  revalidatePath("/orders");
  return { success: true };
}
