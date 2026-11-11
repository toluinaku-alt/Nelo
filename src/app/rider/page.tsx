import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RiderPortalClient } from "./RiderPortalClient";
import { Bike, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Rider Terminal — Nelo Nigeria",
  description: "Rider mobile console, dispatch offers, and delivery execution.",
};

export default async function RiderPage() {
  const user = await getCurrentUser();

  const isRider = user?.role === "RIDER" || user?.role === "ADMIN";

  if (!isRider) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-amber-200 text-center shadow-lg space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Bike className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Rider Terminal Access</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          This portal is reserved for verified freelance and company-employed Nelo dispatch riders.
          Use the demo persona switcher at the top to switch to <strong>Emeka Obi (Rider)</strong>.
        </p>
      </div>
    );
  }

  // Find rider profile
  let rider = user?.riderProfile
    ? await prisma.riderProfile.findUnique({
        where: { id: user.riderProfile.id },
        include: { user: true },
      })
    : await prisma.riderProfile.findFirst({
        include: { user: true },
      });

  if (!rider) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
        <h3 className="text-lg font-bold">No Rider Profile Found</h3>
        <p className="text-xs text-slate-500">Run seed script to initialize demo fleet riders.</p>
      </div>
    );
  }

  // Fetch pending offers for this rider
  const pendingOffers = await prisma.dispatchOffer.findMany({
    where: {
      riderId: rider.id,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    include: {
      delivery: {
        include: {
          order: true,
        },
      },
    },
    orderBy: { offeredAt: "desc" },
  });

  // Fetch active deliveries assigned to this rider
  const activeDeliveries = await prisma.delivery.findMany({
    where: {
      riderId: rider.id,
      status: {
        in: ["ACCEPTED", "ARRIVED_PICKUP", "PICKED_UP", "IN_TRANSIT"],
      },
    },
    include: {
      order: {
        include: {
          packageDetails: true,
          shopForMeDetails: {
            include: { items: true },
          },
        },
      },
    },
  });

  // Fetch completed deliveries
  const completedDeliveries = await prisma.delivery.findMany({
    where: {
      riderId: rider.id,
      status: "DELIVERED",
    },
    include: {
      order: true,
    },
    orderBy: { deliveryTime: "desc" },
    take: 10,
  });

  return (
    <RiderPortalClient
      rider={{
        id: rider.id,
        fullName: rider.user.fullName,
        employmentType: rider.employmentType,
        plateNumber: rider.plateNumber,
        walletBalanceKobo: rider.walletBalanceKobo,
        totalDeliveries: rider.totalDeliveries,
        rating: rider.rating,
        isOnline: rider.isOnline,
      }}
      pendingOffers={pendingOffers.map((o) => {
        let pickupArea = "Central Zone";
        let dropoffArea = "Customer Destination";
        try {
          const p = JSON.parse(o.delivery.order.pickupAddressJson);
          pickupArea = p.name || p.address?.substring(0, 30) || pickupArea;
        } catch (e) {}
        try {
          const d = JSON.parse(o.delivery.order.dropoffAddressJson);
          dropoffArea = d.city || d.address?.substring(0, 30) || dropoffArea;
        } catch (e) {}

        return {
          id: o.id,
          deliveryId: o.deliveryId,
          orderNumber: o.delivery.order.orderNumber,
          serviceType: o.delivery.order.serviceType,
          distanceKm: o.delivery.distanceKm,
          estimatedMinutes: o.delivery.estimatedDurationMinutes,
          riderEarningsKobo: o.delivery.riderEarningsKobo,
          pickupGeneralArea: pickupArea,
          dropoffGeneralArea: dropoffArea,
          expiresAt: o.expiresAt.toISOString(),
        };
      })}
      activeDeliveries={activeDeliveries.map((del) => {
        let pickup = { name: "Pickup", address: "Lagos", phone: "" };
        let dropoff = { name: "Dropoff", address: "Lagos", phone: "" };
        try {
          pickup = JSON.parse(del.order.pickupAddressJson);
        } catch (e) {}
        try {
          dropoff = JSON.parse(del.order.dropoffAddressJson);
        } catch (e) {}

        return {
          id: del.id,
          orderId: del.order.id,
          orderNumber: del.order.orderNumber,
          serviceType: del.order.serviceType,
          status: del.status,
          riderEarningsKobo: del.riderEarningsKobo,
          distanceKm: del.distanceKm,
          estimatedDurationMinutes: del.estimatedDurationMinutes,
          pickupAddress: pickup,
          dropoffAddress: dropoff,
          packageCategory: del.order.packageDetails?.packageCategory,
          goodsBudgetKobo: del.order.shopForMeDetails?.goodsBudgetKobo,
          spendingLimitKobo: del.order.shopForMeDetails?.spendingLimitKobo,
          shopName: del.order.shopForMeDetails?.shopName,
          shopForMeDetails: del.order.shopForMeDetails
            ? {
                ...del.order.shopForMeDetails,
                customerApprovedAt: del.order.shopForMeDetails.customerApprovedAt?.toISOString() || null,
                shopPaidAt: del.order.shopForMeDetails.shopPaidAt?.toISOString() || null,
                pickupReleasedAt: del.order.shopForMeDetails.pickupReleasedAt?.toISOString() || null,
              }
            : null,
        };
      })}
      completedDeliveries={completedDeliveries.map((cd) => ({
        id: cd.id,
        orderNumber: cd.order.orderNumber,
        serviceType: cd.order.serviceType,
        deliveredAt: (cd.deliveryTime || cd.updatedAt).toISOString(),
        earningsKobo: cd.riderEarningsKobo,
      }))}
    />
  );
}
