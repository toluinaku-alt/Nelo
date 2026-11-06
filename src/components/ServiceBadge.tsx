import { ServiceType } from "@/lib/types";
import { Utensils, ShoppingBag, Package } from "lucide-react";

export function ServiceBadge({
  type,
  serviceType,
}: {
  type?: ServiceType | string;
  serviceType?: ServiceType | string;
}) {
  const activeType = serviceType || type;

  switch (activeType) {
    case "MARKETPLACE":
      return (
        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold">
          <Utensils className="h-3 w-3" />
          Marketplace
        </span>
      );
    case "SHOP_FOR_ME":
      return (
        <span className="badge bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold">
          <ShoppingBag className="h-3 w-3" />
          Shop for Me
        </span>
      );
    case "PACKAGE":
      return (
        <span className="badge bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold">
          <Package className="h-3 w-3" />
          Package Courier
        </span>
      );
    default:
      return (
        <span className="badge bg-slate-100 text-slate-700 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold">
          {activeType}
        </span>
      );
  }
}
