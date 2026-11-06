import { OrderStatus } from "@/lib/types";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  ChefHat,
  PackageCheck,
  UserCheck,
} from "lucide-react";

export function StatusBadge({ status }: { status: OrderStatus | string }) {
  switch (status) {
    case "DRAFT":
    case "QUOTED":
      return (
        <span className="badge bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="h-3 w-3" />
          Draft Quote
        </span>
      );
    case "PLACED":
      return (
        <span className="badge bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="h-3 w-3" />
          Order Placed
        </span>
      );
    case "VENDOR_ACCEPTED":
      return (
        <span className="badge bg-purple-50 text-purple-700 border border-purple-200">
          <ChefHat className="h-3 w-3" />
          Kitchen Prepping
        </span>
      );
    case "AWAITING_RIDER":
      return (
        <span className="badge bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="h-3 w-3" />
          Finding Nearby Rider
        </span>
      );
    case "ASSIGNED":
      return (
        <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-200">
          <UserCheck className="h-3 w-3" />
          Rider Assigned
        </span>
      );
    case "PICKED_UP":
    case "IN_TRANSIT":
      return (
        <span className="badge bg-cyan-50 text-cyan-700 border border-cyan-200">
          <Truck className="h-3 w-3" />
          On The Way
        </span>
      );
    case "DELIVERED":
      return (
        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
          <PackageCheck className="h-3 w-3" />
          Delivered
        </span>
      );
    case "DECLINED":
    case "CANCELLED":
    case "PAYMENT_FAILED":
      return (
        <span className="badge bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="h-3 w-3" />
          Cancelled
        </span>
      );
    case "REFUNDED":
      return (
        <span className="badge bg-gray-100 text-gray-700 border border-gray-300">
          <RotateCcw className="h-3 w-3" />
          Refunded
        </span>
      );
    default:
      return <span className="badge bg-slate-100 text-slate-700">{status}</span>;
  }
}
