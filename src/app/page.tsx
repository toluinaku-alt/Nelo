import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatKoboToNaira } from "@/lib/types";
import {
  Utensils,
  ShoppingBag,
  Package,
  ArrowRight,
  ShieldCheck,
  Search,
  Star,
  Clock,
  MapPin,
  CheckCircle2,
} from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();
  const vendors = await prisma.vendor.findMany({
    take: 3,
    where: { zone: { name: { contains: "Calabar" } } },
    include: {
      zone: true,
      catalogItems: { take: 2 },
    },
  });

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-nelo-950 via-slate-900 to-nelo-900 text-white p-8 sm:p-12 shadow-xl border border-nelo-800">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live across Calabar • Built for Nigeria
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Order food, send personal shoppers, or courier packages across town.
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Welcome to <span className="text-emerald-400 font-bold">Nelo</span>. Three core logistics services united in one seamless platform — with verified local vendors, freelance rider dispatch, and bank-grade ledger security.
          </p>

          {/* Quick Track Input */}
          <div className="pt-2">
            <form action="/track" method="GET" className="flex flex-col sm:flex-row gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  name="orderNumber"
                  type="text"
                  placeholder="Enter order number (e.g. NELO-MK-2041)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="btn-primary whitespace-nowrap bg-emerald-600 hover:bg-emerald-700"
              >
                Track Order
              </button>
            </form>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-2">
              <span>Try sample seed orders:</span>
              <Link href="/track/NELO-MK-2041" className="underline hover:text-emerald-300 font-mono">
                NELO-MK-2041
              </Link>
              <span>•</span>
              <Link href="/track/NELO-SFM-8832" className="underline hover:text-emerald-300 font-mono">
                NELO-SFM-8832
              </Link>
              <span>•</span>
              <Link href="/track/NELO-PKG-5192" className="underline hover:text-emerald-300 font-mono">
                NELO-PKG-5192
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Services Cards */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Three Core Services
          </h2>
          <p className="text-slate-600 text-sm">
            Equal priority workflows built specifically for Nigerian urban lifestyles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Service 1: Marketplace */}
          <div className="card hover:border-emerald-300 hover:shadow-md transition group flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition">
                <Utensils className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Service 01
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  Marketplace Delivery
                </h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Order sizzling Jollof rice, soups, and fresh groceries from verified restaurants and supermarkets in Victoria Island, Lekki, and Wuse.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Verified local vendors & menus
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Single-vendor cart & checkout
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link
                href="/marketplace"
                className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Browse Marketplace <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Service 2: Shop for Me */}
          <div className="card hover:border-amber-300 hover:shadow-md transition group flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Service 02
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  Shop for Me (Concierge)
                </h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Send a dedicated personal shopper to Balogun Market, Mile 12, or your favorite neighborhood stall. Specify goods budget and substitution rules.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                  Custom stores & open-air market stalls
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                  Receipt upload & automatic refund reconciliation
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link
                href="/shop-for-me"
                className="btn-accent w-full"
              >
                Hire a Shopper <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Service 3: Package Delivery */}
          <div className="card hover:border-blue-300 hover:shadow-md transition group flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Service 03
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  Package Courier
                </h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Direct point-to-point document and parcel delivery across town. Secured by a mandatory 4-digit recipient verification PIN at handoff.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  Secure 4-digit drop-off PIN protection
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  Weight and dimension zone pricing
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link
                href="/send-package"
                className="btn-secondary w-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
              >
                Send a Package <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Vendors Showcase */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Verified Vendors in Calabar
            </h2>
            <p className="text-slate-600 text-sm">
              Authentic meals and farm-fresh grocery staples prepared with care.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="text-sm font-semibold text-nelo-600 hover:underline inline-flex items-center gap-1"
          >
            View All Vendors <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {vendors.map((vendor) => (
            <Link
              key={vendor.id}
              href={`/marketplace/${vendor.slug}`}
              className="card group hover:border-nelo-500 hover:shadow-md transition p-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="badge bg-slate-100 text-slate-700 font-medium">
                    {vendor.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    {vendor.rating.toFixed(1)}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-nelo-600 transition">
                    {vendor.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span>{vendor.city} ({vendor.zone.name})</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">
                  {vendor.description}
                </p>

                {vendor.catalogItems.length > 0 && (
                  <div className="border-t border-slate-100 pt-3 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Popular Items:
                    </span>
                    {vendor.catalogItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs text-slate-700"
                      >
                        <span className="truncate max-w-[180px]">{item.name}</span>
                        <span className="font-semibold text-nelo-700 font-mono">
                          {formatKoboToNaira(item.priceKobo, false)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 mt-4">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  ~{vendor.prepTimeMinutes} mins prep
                </span>
                <span className="font-semibold text-nelo-600 group-hover:translate-x-1 transition inline-flex items-center gap-1">
                  Order Now <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Strict Audience Boundary & Security Note */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-base">
              Strict Audience Boundaries & Authorization
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 max-w-2xl leading-relaxed">
              Customers are strictly restricted to browsing the marketplace, placing requests, and tracking <strong>only their own orders</strong>. Operations dashboards, rider fleet maps, and financial books are inaccessible to customers at both the server-action and database level.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-emerald-800 border border-emerald-300 shadow-sm">
            Current User: {user.fullName} ({user.role})
          </span>
        </div>
      </section>
    </div>
  );
}
