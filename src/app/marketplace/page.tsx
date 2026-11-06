import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatKoboToNaira } from "@/lib/types";
import {
  Utensils,
  ShoppingBag,
  Star,
  MapPin,
  Clock,
  ArrowRight,
  Search,
} from "lucide-react";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams?: { category?: string; query?: string };
}) {
  const selectedCategory = searchParams?.category;
  const searchQuery = searchParams?.query?.toLowerCase();

  const vendors = await prisma.vendor.findMany({
    where: {
      isVerified: true,
      isOpen: true,
      ...(selectedCategory ? { category: selectedCategory } : {}),
      ...(searchQuery
        ? {
            OR: [
              { name: { contains: searchQuery } },
              { description: { contains: searchQuery } },
            ],
          }
        : {}),
    },
    include: {
      zone: true,
      catalogItems: {
        where: { isAvailable: true },
        take: 3,
      },
    },
    orderBy: { rating: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Marketplace Delivery
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Verified food restaurants & grocery stores across Lagos and Abuja.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2">
          <Link
            href="/marketplace"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              !selectedCategory
                ? "bg-nelo-600 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Stores
          </Link>
          <Link
            href="/marketplace?category=FOOD"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              selectedCategory === "FOOD"
                ? "bg-nelo-600 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Utensils className="h-3.5 w-3.5" />
            Restaurants
          </Link>
          <Link
            href="/marketplace?category=GROCERY"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              selectedCategory === "GROCERY"
                ? "bg-nelo-600 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Groceries
          </Link>
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            className="card group hover:border-emerald-300 hover:shadow-md transition flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {vendor.category === "FOOD" ? "Cooked Meals" : "Fresh Grocery"}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  {vendor.rating.toFixed(1)}
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  {vendor.name}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{vendor.streetAddress}, {vendor.city}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {vendor.description}
              </p>

              {/* Sample Items Preview */}
              {vendor.catalogItems.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Featured Menu:
                  </span>
                  {vendor.catalogItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-800 font-medium truncate max-w-[200px]">
                        {item.name}
                      </span>
                      <span className="font-semibold text-emerald-800 font-mono">
                        {formatKoboToNaira(item.priceKobo, false)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                ~{vendor.prepTimeMinutes} mins prep
              </span>
              <Link
                href={`/marketplace/${vendor.slug}`}
                className="btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700"
              >
                View Catalog & Order <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
