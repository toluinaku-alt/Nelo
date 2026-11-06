import { getCurrentUser } from "@/lib/auth";
import { SendPackageClient } from "./SendPackageClient";

export const metadata = {
  title: "Send a Package — Nelo Courier Nigeria",
  description: "Point-to-point intracity courier and parcel delivery across Lagos and Abuja.",
};

export default async function SendPackagePage() {
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

  return (
    <SendPackageClient
      customerAddresses={customerAddresses}
      defaultSenderName={user?.fullName || "Chioma Adeleke"}
      defaultSenderPhone={(user as any)?.phone || "+234 803 123 4567"}
    />
  );
}
