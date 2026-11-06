"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getCurrentUser, requireRole, requireStaff } from "./auth";
import { acceptDeliveryOffer, declineDeliveryOffer, createDispatchOffers } from "./dispatch";
import { recordLedgerEntry, reconcileShopForMeLedger } from "./ledger";
import { notificationAdapter } from "./adapters/notification";
import { estimateRoute } from "./adapters/maps";

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
  items: { name: string; quantity: number; unit?: string; notes?: string }[];
  deliveryAddress: {
    label: string;
    streetAddress: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  notes?: string;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" && user.role !== "ADMIN") {
    throw new Error("Only customers can place Shop for Me requests.");
  }

  // Get Lagos Central Zone
  const zone = await prisma.serviceZone.findFirst() || await prisma.serviceZone.create({
    data: {
      name: "Lagos Central",
      state: "Lagos",
      baseFareKobo: 150000,
      perKmRateKobo: 20000,
    },
  });

  const conciergeServiceFeeKobo = 100000; // ₦1,000 personal shopper service fee
  const deliveryFeeKobo = 150000; // ₦1,500 base delivery
  const totalAmountKobo = data.goodsBudgetKobo + conciergeServiceFeeKobo + deliveryFeeKobo;

  const orderNumber = `NELO-SFM-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        customerId: user.id,
        serviceType: "SHOP_FOR_ME",
        status: "AWAITING_RIDER",
        zoneId: zone.id,
        subtotalKobo: data.goodsBudgetKobo,
        deliveryFeeKobo,
        serviceFeeKobo: conciergeServiceFeeKobo,
        totalAmountKobo,
        pickupAddressJson: JSON.stringify({
          name: data.shopName,
          address: data.shopAddress,
          latitude: 6.4578, // Central market default
          longitude: 3.3855,
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
            items: {
              create: data.items.map((it) => ({
                itemName: it.name,
                quantity: it.quantity,
                unit: it.unit || "item",
                notes: it.notes || "",
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
            distanceKm: 6.5,
            estimatedDurationMinutes: 45,
            riderEarningsKobo: Math.round(deliveryFeeKobo * 0.8) + 50000, // rider gets delivery cut + ₦500 concierge tip
            status: "PENDING_DISPATCH",
          },
        },
        events: {
          create: {
            eventType: "ORDER_PLACED",
            actorId: user.id,
            actorRole: "CUSTOMER",
            metadataJson: JSON.stringify({
              shopName: data.shopName,
              goodsBudgetKobo: data.goodsBudgetKobo,
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

  // Hold goods budget in Escrow account
  await recordLedgerEntry({
    orderId: order.id,
    debitAccountCode: "CUSTOMER_WALLET",
    creditAccountCode: "ESCROW_GOODS",
    amountKobo: data.goodsBudgetKobo,
    description: `Shop-for-Me Order ${orderNumber} - Reserved items purchasing budget held in Escrow`,
    referenceType: "ORDER_PAYMENT",
  });

  if (order.delivery) {
    await createDispatchOffers(order.delivery.id);
  }

  revalidatePath("/orders");
  revalidatePath("/rider");
  return { success: true, orderNumber: order.orderNumber };
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
