import { getCurrentUser } from "@/lib/auth";
import { ShopForMeClient } from "./ShopForMeClient";

export const metadata = {
  title: "Shop for Me — Nelo Nigeria",
  description: "Personal concierge shopping from any market or unlisted store in Nigeria.",
};

export default async function ShopForMePage() {
  const user = await getCurrentUser();

  const customerAddresses = user?.addresses && user.addresses.length > 0
    ? user.addresses
    : [
        {
          id: "addr-chioma-home",
          userId: user?.id || "mock-user",
          label: "Home (Lekki Phase 1)",
          streetAddress: "14 Admiralty Way, Lekki Phase 1",
          city: "Lagos",
          latitude: 6.4474,
          longitude: 3.4735,
        },
        {
          id: "addr-chioma-office",
          userId: user?.id || "mock-user",
          label: "Office (Victoria Island)",
          streetAddress: "Plot 12A Karimu Kotun, Victoria Island",
          city: "Lagos",
          latitude: 6.4281,
          longitude: 3.4219,
        },
      ];

  return <ShopForMeClient customerAddresses={customerAddresses} />;
}
