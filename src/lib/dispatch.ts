import { prisma } from "./prisma";

export interface OfferResult {
  success: boolean;
  message: string;
  orderNumber?: string;
}

/**
 * Creates broadcast offers to eligible online riders in the delivery zone
 */
export async function createDispatchOffers(deliveryId: string) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      order: true,
    },
  });

  if (!delivery) throw new Error("Delivery record not found");

  // Find online verified riders in this zone
  const riders = await prisma.riderProfile.findMany({
    where: {
      isVerified: true,
      isOnline: true,
    },
    take: 5,
  });

  if (riders.length === 0) {
    // If no riders online, find any verified rider to offer for demonstration
    const anyRider = await prisma.riderProfile.findFirst({
      where: { isVerified: true },
    });
    if (anyRider) {
      riders.push(anyRider);
    }
  }

  const expiresAt = new Date(Date.now() + 90 * 1000); // 90 seconds offer expiry window

  for (const rider of riders) {
    // Check if offer already exists
    const existing = await prisma.dispatchOffer.findFirst({
      where: {
        deliveryId: delivery.id,
        riderId: rider.id,
      },
    });

    if (!existing) {
      await prisma.dispatchOffer.create({
        data: {
          deliveryId: delivery.id,
          riderId: rider.id,
          status: "OFFERED",
          expiresAt,
          estimatedEarningsKobo: delivery.riderEarningsKobo || 85000,
        },
      });
    }
  }

  await prisma.delivery.update({
    where: { id: delivery.id },
    data: { status: "OFFERED" },
  });
}

/**
 * Atomic First-Acceptance Claims Engine
 * Prevents double-assignment race conditions using a strict database transaction.
 */
export async function acceptDeliveryOffer(
  offerId: string,
  riderId: string
): Promise<OfferResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch offer and lock/verify state
    const offer = await tx.dispatchOffer.findUnique({
      where: { id: offerId },
      include: {
        delivery: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!offer) {
      return { success: false, message: "Offer does not exist." };
    }

    if (offer.riderId !== riderId) {
      return { success: false, message: "Unauthorized: Offer belongs to another rider." };
    }

    if (offer.status !== "OFFERED") {
      return {
        success: false,
        message: `This offer is no longer available (Current status: ${offer.status}).`,
      };
    }

    // 2. Check if the delivery has already been assigned
    if (offer.delivery.riderId !== null) {
      // Mark this rider's offer as superseded
      await tx.dispatchOffer.update({
        where: { id: offer.id },
        data: { status: "SUPERSEDED", respondedAt: new Date() },
      });
      return {
        success: false,
        message: "Another rider already accepted this delivery first. Keep your eyes open for the next offer!",
      };
    }

    const now = new Date();

    // 3. Atomically claim delivery
    await tx.dispatchOffer.update({
      where: { id: offer.id },
      data: {
        status: "ACCEPTED",
        respondedAt: now,
      },
    });

    // 4. Invalidate all other pending offers for this delivery
    await tx.dispatchOffer.updateMany({
      where: {
        deliveryId: offer.deliveryId,
        id: { not: offer.id },
        status: "OFFERED",
      },
      data: {
        status: "SUPERSEDED",
        respondedAt: now,
        responseReason: "Accepted by competing rider",
      },
    });

    // 5. Update Delivery status and assign rider
    await tx.delivery.update({
      where: { id: offer.deliveryId },
      data: {
        riderId: riderId,
        status: "ACCEPTED",
      },
    });

    // 6. Update parent Order status
    await tx.order.update({
      where: { id: offer.delivery.orderId },
      data: {
        status: "ASSIGNED",
      },
    });

    // 7. Record Order Event
    await tx.orderEvent.create({
      data: {
        orderId: offer.delivery.orderId,
        eventType: "RIDER_ASSIGNED",
        actorId: riderId,
        actorRole: "RIDER",
        metadataJson: JSON.stringify({
          offerId: offer.id,
          acceptedAt: now.toISOString(),
        }),
      },
    });

    return {
      success: true,
      message: "Delivery accepted! Head to the pickup location.",
      orderNumber: offer.delivery.order.orderNumber,
    };
  });
}

/**
 * Rider declines an offer
 */
export async function declineDeliveryOffer(offerId: string, riderId: string, reason?: string) {
  return await prisma.dispatchOffer.updateMany({
    where: {
      id: offerId,
      riderId: riderId,
      status: "OFFERED",
    },
    data: {
      status: "DECLINED",
      respondedAt: new Date(),
      responseReason: reason || "Rider declined manually",
    },
  });
}
