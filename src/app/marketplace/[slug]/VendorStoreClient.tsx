"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatKoboToNaira } from "@/lib/types";
import { createMarketplaceOrderAction } from "@/lib/actions";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  UtensilsCrossed,
} from "lucide-react";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  priceKobo: number;
}

interface Category {
  id: string;
  name: string;
  items: CatalogItem[];
}

interface VendorStoreClientProps {
  vendor: {
    id: string;
    name: string;
    slug: string;
    description: string;
    streetAddress: string;
    city: string;
    rating: number;
    prepTimeMinutes: number;
  };
  categories: Category[];
  customerAddresses: {
    id: string;
    label: string;
    streetAddress: string;
    city: string;
    latitude: number;
    longitude: number;
  }[];
}

export function VendorStoreClient({
  vendor,
  categories,
  customerAddresses,
}: VendorStoreClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Cart: item id -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [vendorInstructions, setVendorInstructions] = useState("");
  const [cutleryIncluded, setCutleryIncluded] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(
    customerAddresses[0]?.id || "default"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Flatten items for lookup
  const allItems = categories.flatMap((c) => c.items);
  const getItem = (id: string) => allItems.find((i) => i.id === id);

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: current - 1 };
    });
  };

  const cartEntries = Object.entries(cart)
    .map(([id, qty]) => ({ item: getItem(id)!, qty }))
    .filter((e) => e.item && e.qty > 0);

  const subtotalKobo = cartEntries.reduce(
    (sum, e) => sum + e.item.priceKobo * e.qty,
    0
  );
  const deliveryFeeKobo = 150000; // ₦1,500 base delivery
  const serviceFeeKobo = 30000; // ₦300 platform fee
  const totalAmountKobo = subtotalKobo > 0 ? subtotalKobo + deliveryFeeKobo + serviceFeeKobo : 0;

  const handleCheckout = () => {
    if (cartEntries.length === 0) return;
    setErrorMsg(null);

    const address = customerAddresses.find((a) => a.id === selectedAddressId) || {
      label: "Home (Lekki Phase 1)",
      streetAddress: "14 Admiralty Way, Lekki Phase 1",
      city: "Lagos",
      latitude: 6.4474,
      longitude: 3.4735,
    };

    startTransition(async () => {
      try {
        const res = await createMarketplaceOrderAction({
          vendorId: vendor.id,
          items: cartEntries.map((e) => ({
            catalogItemId: e.item.id,
            name: e.item.name,
            priceKobo: e.item.priceKobo,
            quantity: e.qty,
          })),
          deliveryAddress: address,
          vendorInstructions,
          cutleryIncluded,
        });

        if (res.success) {
          router.push(`/track/${res.orderNumber}`);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to place order.");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Menu / Catalog Columns */}
      <div className="lg:col-span-2 space-y-8">
        {/* Vendor Header */}
        <div className="card bg-white p-6 space-y-3 border-emerald-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span>Verified Vendor</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="h-3.5 w-3.5" /> ~{vendor.prepTimeMinutes} mins prep
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {vendor.name}
          </h1>
          <p className="text-sm text-slate-600">{vendor.description}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span>{vendor.streetAddress}, {vendor.city}</span>
          </div>
        </div>

        {/* Menu Categories */}
        {categories.map((category) => (
          <div key={category.id} className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
              {category.name}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {category.items.map((item) => {
                const qtyInCart = cart[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="card p-4 hover:border-emerald-300 transition flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
                      <span className="font-extrabold text-slate-900 text-sm font-mono">
                        {formatKoboToNaira(item.priceKobo, false)}
                      </span>

                      {qtyInCart > 0 ? (
                        <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-1 border border-emerald-200">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="h-6 w-6 rounded bg-white text-emerald-700 flex items-center justify-center hover:bg-emerald-100 shadow-xs"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold text-emerald-900 px-1">
                            {qtyInCart}
                          </span>
                          <button
                            type="button"
                            onClick={() => addToCart(item.id)}
                            className="h-6 w-6 rounded bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 shadow-xs"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(item.id)}
                          className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Cart Drawer */}
      <div className="space-y-6">
        <div className="card sticky top-28 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
              Your Order Basket
            </h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
              {cartEntries.reduce((s, e) => s + e.qty, 0)} items
            </span>
          </div>

          {cartEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-2">
              <UtensilsCrossed className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-xs">Your basket is empty.</p>
              <p className="text-[11px] text-slate-400">
                Add delicious items from {vendor.name} to start your order.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Item lines */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {cartEntries.map(({ item, qty }) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <div className="flex-1 pr-2">
                      <p className="font-semibold text-slate-800 line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {qty} × {formatKoboToNaira(item.priceKobo, false)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">
                        {formatKoboToNaira(item.priceKobo * qty, false)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Address Choice */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700 block">
                  Delivery Destination:
                </label>
                <select
                  value={selectedAddressId}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  {customerAddresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {addr.label}: {addr.streetAddress}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cooking Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Special Kitchen Request (Optional):
                </label>
                <input
                  type="text"
                  value={vendorInstructions}
                  onChange={(e) => setVendorInstructions(e.target.value)}
                  placeholder="e.g. Medium pepper, no onions in sauce"
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>

              {/* Cutlery option */}
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cutleryIncluded}
                  onChange={(e) => setCutleryIncluded(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Include eco-friendly disposable cutlery & napkins</span>
              </label>

              {/* Price Breakdown in Kobo/Naira */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatKoboToNaira(subtotalKobo)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Fee</span>
                  <span className="font-mono">{formatKoboToNaira(deliveryFeeKobo)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Service Platform Fee</span>
                  <span className="font-mono">{formatKoboToNaira(serviceFeeKobo)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-2 border-t border-slate-200">
                  <span>Total Amount</span>
                  <span className="text-emerald-700 font-mono">
                    {formatKoboToNaira(totalAmountKobo)}
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Payment Button */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isPending || cartEntries.length === 0}
                className="btn-primary w-full py-3 bg-emerald-600 hover:bg-emerald-700 shadow-md"
              >
                <CreditCard className="h-4 w-4" />
                {isPending ? "Processing Paystack Sandbox..." : "Pay with Mock Paystack"}
              </button>

              <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Sandbox Mode: Auto-authorized test transaction</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
