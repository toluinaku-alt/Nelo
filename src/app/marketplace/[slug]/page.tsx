import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { VendorStoreClient } from "./VendorStoreClient";

export default async function VendorStorePage({
  params,
}: {
  params: { slug: string };
}) {
  const vendor = await prisma.vendor.findUnique({
    where: { slug: params.slug },
    include: {
      catalogCategories: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { isAvailable: true },
          },
        },
      },
    },
  });

  if (!vendor) {
    notFound();
  }

  const user = await getCurrentUser();
  const userAddresses = user?.addresses && user.addresses.length > 0 ? user.addresses : null;
  const customerAddresses = userAddresses || [
    {
      id: "addr-chioma-home",
      userId: user?.id || "mock-user",
      label: "Home (Lekki Phase 1)",
      streetAddress: "14 Admiralty Way, Lekki Phase 1",
      city: "Lagos",
      state: "Lagos State",
      latitude: 6.4474,
      longitude: 3.4735,
      deliveryInstructions: null,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "addr-chioma-office",
      userId: user?.id || "mock-user",
      label: "Office (Victoria Island)",
      streetAddress: "Plot 12A Karimu Kotun, Victoria Island",
      city: "Lagos",
      state: "Lagos State",
      latitude: 6.4281,
      longitude: 3.4219,
      deliveryInstructions: null,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  return (
    <div className="space-y-6">
      <VendorStoreClient
        vendor={{
          id: vendor.id,
          name: vendor.name,
          slug: vendor.slug,
          description: vendor.description,
          streetAddress: vendor.streetAddress,
          city: vendor.city,
          rating: vendor.rating,
          prepTimeMinutes: vendor.prepTimeMinutes,
        }}
        categories={vendor.catalogCategories.map((c) => ({
          id: c.id,
          name: c.name,
          items: c.items.map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            priceKobo: i.priceKobo,
          })),
        }))}
        customerAddresses={customerAddresses.map((a: any) => ({
          id: a.id,
          label: a.label,
          streetAddress: a.streetAddress,
          city: a.city,
          latitude: a.latitude,
          longitude: a.longitude,
        }))}
      />
    </div>
  );
}
