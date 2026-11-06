import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VendorPortalClient } from "./VendorPortalClient";
import { ShieldAlert, Store } from "lucide-react";

export const metadata = {
  title: "Vendor Portal — Nelo Nigeria",
  description: "Manage restaurant menu, incoming orders, and prep workflow.",
};

export default async function VendorPage() {
  const user = await getCurrentUser();

  const isVendorStaff =
    user?.role === "VENDOR_OWNER" ||
    user?.role === "VENDOR_STAFF" ||
    user?.role === "ADMIN";

  if (!isVendorStaff) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-purple-200 text-center shadow-lg space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
          <Store className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Vendor Portal Access</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          This portal is reserved for verified Nelo restaurant and grocery vendors. 
          Use the role switcher at the top to switch to <strong>Chef Babatunde (Vendor Owner)</strong> or sign in with vendor credentials.
        </p>
      </div>
    );
  }

  // Find vendor associated with this user or first seed vendor
  let vendorId = user?.vendorStaff?.[0]?.vendorId;
  let vendor = vendorId
    ? await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
          catalogCategories: {
            include: { items: true },
          },
        },
      })
    : await prisma.vendor.findFirst({
        include: {
          catalogCategories: {
            include: { items: true },
          },
        },
      });

  if (!vendor) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
        <h3 className="text-lg font-bold">No Vendor Profile Found</h3>
        <p className="text-xs text-slate-500">Run seed script to initialize demo vendors.</p>
      </div>
    );
  }

  // Fetch orders for this vendor
  const orders = await prisma.order.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      items: true,
      marketplaceDetails: true,
    },
  });

  const catalogItems = vendor.catalogCategories.flatMap((cat) =>
    cat.items.map((i) => ({
      id: i.id,
      name: i.name,
      priceKobo: i.priceKobo,
      isAvailable: i.isAvailable,
      categoryName: cat.name,
    }))
  );

  return (
    <VendorPortalClient
      vendor={{
        id: vendor.id,
        name: vendor.name,
        category: vendor.category,
        streetAddress: vendor.streetAddress,
        city: vendor.city,
        isAcceptingOrders: vendor.isOpen,
        prepTimeMinutes: vendor.prepTimeMinutes,
        payoutBankName: vendor.payoutBankCode ? `Bank (${vendor.payoutBankCode})` : "Zenith Bank PLC",
        payoutAccountNumber: vendor.payoutAccountNum || "1019283746",
      }}
      orders={orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        totalAmountKobo: o.totalAmountKobo,
        subtotalKobo: o.subtotalKobo,
        customerName: o.customer.fullName,
        customerPhone: o.customer.phone,
        items: o.items.map((item) => ({
          id: item.id,
          nameSnapshot: item.nameSnapshot,
          quantity: item.quantity,
          priceKoboSnapshot: item.priceKoboSnapshot,
        })),
        marketplaceDetails: o.marketplaceDetails,
      }))}
      catalogItems={catalogItems}
    />
  );
}
