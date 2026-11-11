import { getCurrentUser } from "@/lib/auth";
import { CALABAR_PILOT_ADDRESSES } from "@/lib/types";
import { ShopForMeClient } from "./ShopForMeClient";

export const metadata = {
  title: "Shop for Me — Calabar Pilot | Nelo Nigeria",
  description: "Personal concierge shopping from verified markets and shops across Calabar.",
};

export default async function ShopForMePage() {
  const user = await getCurrentUser();

  // Combine user addresses with Calabar pilot address presets for testing
  const userAddresses = user?.addresses || [];

  const pilotAddresses = [
    ...CALABAR_PILOT_ADDRESSES.map((a) => ({
      id: a.id,
      label: a.label,
      streetAddress: a.streetAddress,
      city: a.city,
      state: a.state,
      zoneId: a.zoneId,
      zoneName: a.zoneName,
      isServiceable: a.isServiceable,
      latitude: a.latitude,
      longitude: a.longitude,
      notes: a.notes,
    })),
  ];

  return <ShopForMeClient customerAddresses={pilotAddresses} />;
}
