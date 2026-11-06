import Link from "next/link";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import {
  Bike,
  Store,
  ShieldCheck,
  Package,
  ShoppingBag,
  Utensils,
  ClipboardList,
  Compass,
} from "lucide-react";

export async function Navbar() {
  const user = await getCurrentUser();
  const isStaff = user ? isStaffRole(user.role) : false;
  const isVendor = user?.role === "VENDOR_OWNER" || user?.role === "VENDOR_STAFF" || user?.role === "ADMIN";
  const isRider = user?.role === "RIDER" || user?.role === "ADMIN";

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-[37px] z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-10 w-10 rounded-xl bg-nelo-600 text-white flex items-center justify-center font-black text-xl shadow-md group-hover:bg-nelo-700 transition">
              N
            </div>
            <div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                Nelo
              </span>
              <span className="block text-[10px] font-semibold text-nelo-600 uppercase tracking-widest -mt-1">
                Nigeria Logistics
              </span>
            </div>
          </Link>

          {/* Core Services Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/marketplace"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-nelo-600 hover:bg-slate-50 flex items-center gap-1.5 transition"
            >
              <Utensils className="h-4 w-4 text-emerald-600" />
              Marketplace
            </Link>
            <Link
              href="/shop-for-me"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-nelo-600 hover:bg-slate-50 flex items-center gap-1.5 transition"
            >
              <ShoppingBag className="h-4 w-4 text-amber-600" />
              Shop for Me
            </Link>
            <Link
              href="/send-package"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-nelo-600 hover:bg-slate-50 flex items-center gap-1.5 transition"
            >
              <Package className="h-4 w-4 text-blue-600" />
              Package Courier
            </Link>
            <Link
              href="/orders"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-nelo-600 hover:bg-slate-50 flex items-center gap-1.5 transition"
            >
              <ClipboardList className="h-4 w-4 text-slate-500" />
              My Orders
            </Link>
          </nav>
        </div>

        {/* Audience / Portal Links */}
        <div className="flex items-center gap-2">
          {/* Vendor Portal Link */}
          {isVendor && (
            <Link
              href="/vendor"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition"
            >
              <Store className="h-3.5 w-3.5" />
              Vendor Store
            </Link>
          )}

          {/* Rider Portal Link */}
          {isRider && (
            <Link
              href="/rider"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
            >
              <Bike className="h-3.5 w-3.5" />
              Rider Portal
            </Link>
          )}

          {/* Internal Operations Staff Link */}
          {isStaff ? (
            <Link
              href="/ops"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-slate-700 shadow-sm transition"
            >
              <ShieldCheck className="h-4 w-4" />
              Ops Dashboard
            </Link>
          ) : (
            <span className="text-[11px] text-slate-400 border border-slate-200 rounded-md px-2 py-1">
              Customer Boundary Active
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
