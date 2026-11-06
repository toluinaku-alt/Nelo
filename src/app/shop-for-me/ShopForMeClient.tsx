"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Plus,
  Trash2,
  MapPin,
  Store,
  DollarSign,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { createShopForMeOrderAction } from "@/lib/actions";

interface ShopForMeClientProps {
  customerAddresses: {
    id: string;
    label: string;
    streetAddress: string;
    city: string;
    latitude: number;
    longitude: number;
  }[];
}

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
}

const POPULAR_MARKETS = [
  {
    name: "Balogun Market (Lagos Island)",
    address: "Balogun Street, Lagos Island, Lagos",
    city: "Lagos",
  },
  {
    name: "Mile 12 Foodstuff Market",
    address: "Ikorodu Road, Ketu, Lagos",
    city: "Lagos",
  },
  {
    name: "Wuse Market (Abuja)",
    address: "Wuse Zone 5, Abuja FCT",
    city: "Abuja",
  },
  {
    name: "Tejuosho Ultra-Modern Market",
    address: "Tejuosho St, Yaba, Lagos",
    city: "Lagos",
  },
  {
    name: "SPAR Supermarket (Victoria Island)",
    address: "Adeola Odeku St, Victoria Island, Lagos",
    city: "Lagos",
  },
];

export function ShopForMeClient({ customerAddresses }: ShopForMeClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [shopType, setShopType] = useState<"popular" | "custom">("popular");
  const [selectedMarketIndex, setSelectedMarketIndex] = useState(0);
  const [customShopName, setCustomShopName] = useState("");
  const [customShopAddress, setCustomShopAddress] = useState("");

  const [items, setItems] = useState<ShoppingItem[]>([
    {
      id: "1",
      name: "Derica of White Garri (Ijebu)",
      quantity: 4,
      unit: "derica",
      notes: "Please select fresh crunchy batch",
    },
    {
      id: "2",
      name: "Ripe Plantains (Large Bunch)",
      quantity: 2,
      unit: "bunch",
      notes: "Firm, yellow peel",
    },
    {
      id: "3",
      name: "Tatashe & Scotch Bonnet (Rodo) Peppers",
      quantity: 1,
      unit: "basket",
      notes: "Fresh red peppers, no bruised ones",
    },
  ]);

  const [goodsBudgetNaira, setGoodsBudgetNaira] = useState<number>(15000);
  const [spendingCapNaira, setSpendingCapNaira] = useState<number>(18000);
  const [substitutionPreference, setSubstitutionPreference] = useState(
    "CALL_CUSTOMER"
  );
  const [generalNotes, setGeneralNotes] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState(
    customerAddresses[0]?.id || "default"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: "",
        quantity: 1,
        unit: "item",
        notes: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      alert("At least one item is required.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof ShoppingItem, val: any) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: val } : i))
    );
  };

  // Fees Breakdown in Naira
  const conciergeFeeNaira = 1000;
  const deliveryFeeNaira = 1500;
  const totalAuthorizationNaira = goodsBudgetNaira + conciergeFeeNaira + deliveryFeeNaira;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    const invalidItem = items.find((i) => !i.name.trim());
    if (invalidItem) {
      setErrorMsg("Please provide a name for all items on your shopping list.");
      return;
    }

    if (goodsBudgetNaira < 1000) {
      setErrorMsg("Minimum shopping budget is ₦1,000.");
      return;
    }

    if (spendingCapNaira < goodsBudgetNaira) {
      setErrorMsg("Maximum spending cap must be equal to or greater than the goods budget.");
      return;
    }

    const shopName =
      shopType === "popular"
        ? POPULAR_MARKETS[selectedMarketIndex].name
        : customShopName.trim();
    const shopAddress =
      shopType === "popular"
        ? POPULAR_MARKETS[selectedMarketIndex].address
        : customShopAddress.trim();

    if (!shopName || !shopAddress) {
      setErrorMsg("Please specify the store or market name and location.");
      return;
    }

    const targetAddress =
      customerAddresses.find((a) => a.id === selectedAddressId) ||
      customerAddresses[0] || {
        label: "Primary Delivery Address",
        streetAddress: "14 Admiralty Way, Lekki Phase 1",
        city: "Lagos",
        latitude: 6.4474,
        longitude: 3.4735,
      };

    startTransition(async () => {
      try {
        const result = await createShopForMeOrderAction({
          shopName,
          shopAddress,
          goodsBudgetKobo: Math.round(goodsBudgetNaira * 100),
          spendingLimitKobo: Math.round(spendingCapNaira * 100),
          substitutionPreference,
          notes: generalNotes,
          items: items.map((i) => ({
            name: i.name,
            quantity: Number(i.quantity) || 1,
            unit: i.unit,
            notes: i.notes,
          })),
          deliveryAddress: {
            label: targetAddress.label,
            streetAddress: targetAddress.streetAddress,
            city: targetAddress.city,
            latitude: targetAddress.latitude,
            longitude: targetAddress.longitude,
          },
        });

        if (result.success) {
          router.push(`/orders`);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to submit Shop for Me request.");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-amber-100">
            <ShoppingBag className="h-3.5 w-3.5" />
            Concierge Shopping Service
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Shop for Me — Personal Market Runner
          </h1>
          <p className="text-amber-100 max-w-2xl text-sm sm:text-base leading-relaxed">
            Need fresh foodstuffs from Balogun Market, supplies from Mile 12, or goods from any unlisted store? 
            Specify what you need, set your goods budget, and a dedicated Nelo rider will procure and deliver directly to your doorstep.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to proceed</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Pick Shop / Market */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center">
                1
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Where should the rider shop?
              </h2>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setShopType("popular")}
                className={`px-3 py-1 rounded-md transition ${
                  shopType === "popular"
                    ? "bg-white text-slate-900 shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Verified Markets
              </button>
              <button
                type="button"
                onClick={() => setShopType("custom")}
                className={`px-3 py-1 rounded-md transition ${
                  shopType === "custom"
                    ? "bg-white text-slate-900 shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Custom Shop / Corner Store
              </button>
            </div>
          </div>

          {shopType === "popular" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {POPULAR_MARKETS.map((market, idx) => (
                <div
                  key={market.name}
                  onClick={() => setSelectedMarketIndex(idx)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition flex items-start gap-3 ${
                    selectedMarketIndex === idx
                      ? "border-amber-600 bg-amber-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <Store
                    className={`h-5 w-5 mt-0.5 shrink-0 ${
                      selectedMarketIndex === idx
                        ? "text-amber-600"
                        : "text-slate-400"
                    }`}
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {market.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {market.address}
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      {market.city}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Shop / Store Name *
                </label>
                <input
                  type="text"
                  required
                  value={customShopName}
                  onChange={(e) => setCustomShopName(e.target.value)}
                  placeholder="e.g. Mama Caro Provisions or Hubmart Ikeja"
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Shop Street Address or Landmark *
                </label>
                <input
                  type="text"
                  required
                  value={customShopAddress}
                  onChange={(e) => setCustomShopAddress(e.target.value)}
                  placeholder="e.g. Beside First Bank, Allen Avenue, Ikeja"
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}
        </section>

        {/* Step 2: Shopping List Items */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center">
                2
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                What should the rider purchase?
              </h2>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">
                    Item #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-red-500 transition"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Item Name & Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={item.name}
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                      placeholder="e.g. Titus Sardines, Yam tubers, Fresh tomatoes"
                      className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, "quantity", parseInt(e.target.value) || 1)
                      }
                      className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Unit / Measurement
                    </label>
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                      className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="item">Piece / Items</option>
                      <option value="derica">Derica (Grain Tin)</option>
                      <option value="paint_rubber">Paint Rubber (Basket)</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="bunch">Bunch</option>
                      <option value="carton">Carton / Pack</option>
                      <option value="bottle">Bottle / Sachet</option>
                    </select>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                    placeholder="Specific instructions (e.g. Brand preference, ripeness, size)"
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-1.5 bg-white text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Step 3: Goods Budget & Spending Limit Safeguards */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center">
              3
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Goods Purchasing Budget & Safeguards
              </h2>
              <p className="text-xs text-slate-500">
                Your estimated budget is placed in secure escrow. The rider submits receipts and any unspent balance is returned automatically.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Estimated Goods Budget (₦) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-500">
                  ₦
                </span>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  required
                  value={goodsBudgetNaira}
                  onChange={(e) =>
                    setGoodsBudgetNaira(Math.max(1000, parseInt(e.target.value) || 0))
                  }
                  className="w-full pl-8 pr-3 py-2 text-base font-bold rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Estimated total cost of the physical items to be bought.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Maximum Spending Cap (₦) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-500">
                  ₦
                </span>
                <input
                  type="number"
                  min={goodsBudgetNaira}
                  step={500}
                  required
                  value={spendingCapNaira}
                  onChange={(e) =>
                    setSpendingCapNaira(Math.max(goodsBudgetNaira, parseInt(e.target.value) || 0))
                  }
                  className="w-full pl-8 pr-3 py-2 text-base font-bold rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                The absolute maximum the rider may spend if market prices fluctuate.
              </p>
            </div>
          </div>

          {/* Substitution Preference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              If an item is unavailable or out of stock:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "CALL_CUSTOMER",
                  title: "Call me first",
                  desc: "Rider must call or WhatsApp before substituting",
                },
                {
                  id: "RIDER_BEST_JUDGMENT",
                  title: "Rider best judgment",
                  desc: "Rider chooses similar brand or comparable size",
                },
                {
                  id: "DO_NOT_SUBSTITUTE",
                  title: "Skip item",
                  desc: "Do not substitute; leave out unavailable items",
                },
              ].map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => setSubstitutionPreference(sub.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    substitutionPreference === sub.id
                      ? "border-amber-600 bg-amber-50/50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{sub.title}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{sub.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Step 4: Delivery Destination */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center">
              4
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Where should we deliver your purchases?
            </h2>
          </div>

          <div className="space-y-3">
            {customerAddresses.map((addr) => (
              <label
                key={addr.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                  selectedAddressId === addr.id
                    ? "border-amber-600 bg-amber-50/40"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="delivery_address"
                    value={addr.id}
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {addr.label}
                    </p>
                    <p className="text-xs text-slate-500">{addr.streetAddress}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {addr.city}
                </span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              General Delivery or Gate Access Notes (Optional)
            </label>
            <input
              type="text"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="e.g. Call at estate security gate; leave with security guard if not home"
              className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </section>

        {/* Pricing Summary & Action */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-bold">Estimated Cost & Authorization</h3>
              <p className="text-xs text-slate-400 mt-1">
                Transparent Nigerian minor unit accounting. Receipt reconciliation performed upon delivery.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block uppercase font-medium">
                Total Hold Amount
              </span>
              <span className="text-3xl font-black text-amber-400">
                ₦{totalAuthorizationNaira.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-slate-400 block">Goods Budget (Held in Escrow)</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                ₦{goodsBudgetNaira.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-slate-400 block">Personal Shopper Concierge</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                ₦{conciergeFeeNaira.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-slate-400 block">Estimated Distance Delivery</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                ₦{deliveryFeeNaira.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span>Simulated Mock Paystack Sandbox • Zero Risk</span>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              {isPending ? "Submitting Request..." : "Request Shop for Me Runner"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
