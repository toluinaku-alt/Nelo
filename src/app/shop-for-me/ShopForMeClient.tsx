"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  Camera,
  Upload,
  X,
  Info,
  Check,
} from "lucide-react";
import { createShopForMeOrderAction } from "@/lib/actions";
import {
  CALABAR_MARKETS,
  CALABAR_ITEM_PHOTO_PRESETS,
  isCalabarServiceable,
  formatKoboToNaira,
} from "@/lib/types";

interface ShopForMeClientProps {
  customerAddresses: {
    id: string;
    label: string;
    streetAddress: string;
    city: string;
    state?: string;
    zoneId?: string;
    zoneName?: string;
    isServiceable?: boolean;
    latitude: number;
    longitude: number;
    notes?: string;
  }[];
}

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
  photoUrl?: string;
}

export function ShopForMeClient({ customerAddresses }: ShopForMeClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [shopType, setShopType] = useState<"popular" | "custom">("popular");
  const [selectedMarketId, setSelectedMarketId] = useState(CALABAR_MARKETS[0].id);
  const [customShopName, setCustomShopName] = useState("");
  const [customShopAddress, setCustomShopAddress] = useState("");

  const [selectedAddressId, setSelectedAddressId] = useState(
    customerAddresses[0]?.id || "default"
  );

  const [items, setItems] = useState<ShoppingItem[]>([
    {
      id: "item-1",
      name: "Fresh Afang Leaves (Shredded)",
      quantity: 3,
      unit: "bunch",
      notes: "Please select fresh, dark green leaves, finely shredded",
      photoUrl: CALABAR_ITEM_PHOTO_PRESETS[0].url,
    },
    {
      id: "item-2",
      name: "Smoked Oron Crayfish",
      quantity: 2,
      unit: "paint_rubber",
      notes: "Clean, dry, sweet smoked batch from Oron",
      photoUrl: CALABAR_ITEM_PHOTO_PRESETS[1].url,
    },
    {
      id: "item-3",
      name: "Cleaned Periwinkle in Shell",
      quantity: 4,
      unit: "derica",
      notes: "Tails clipped, thoroughly washed",
      photoUrl: CALABAR_ITEM_PHOTO_PRESETS[2].url,
    },
  ]);

  const [goodsBudgetNaira, setGoodsBudgetNaira] = useState<number>(18000);
  const [spendingCapNaira, setSpendingCapNaira] = useState<number>(22000);
  const [substitutionPreference, setSubstitutionPreference] = useState("CALL_CUSTOMER");
  const [generalNotes, setGeneralNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Address serviceability evaluation
  const activeAddress = useMemo(() => {
    return (
      customerAddresses.find((a) => a.id === selectedAddressId) ||
      customerAddresses[0]
    );
  }, [customerAddresses, selectedAddressId]);

  const serviceCheck = useMemo(() => {
    if (!activeAddress) return { serviceable: false, reason: "No address selected" };
    return isCalabarServiceable(activeAddress);
  }, [activeAddress]);

  // Filter verified markets based on customer delivery area
  const serviceableMarkets = useMemo(() => {
    if (!serviceCheck.serviceable || !serviceCheck.zoneId) {
      return CALABAR_MARKETS;
    }
    const currentZone = serviceCheck.zoneId as "zone-calabar-municipal" | "zone-calabar-south";
    return CALABAR_MARKETS.filter((m) => m.servesZones.includes(currentZone));
  }, [serviceCheck]);

  // Ensure selected market is valid
  const currentMarket = useMemo(() => {
    return (
      serviceableMarkets.find((m) => m.id === selectedMarketId) ||
      serviceableMarkets[0] ||
      CALABAR_MARKETS[0]
    );
  }, [serviceableMarkets, selectedMarketId]);

  // Budget & Fees
  const conciergeFeeNaira = 1000;
  const deliveryFeeNaira = 1200;
  const totalAuthorizationNaira = goodsBudgetNaira + conciergeFeeNaira + deliveryFeeNaira;

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: "",
        quantity: 1,
        unit: "item",
        notes: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      alert("At least one item is required on your shopping list.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof ShoppingItem, val: any) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: val } : i))
    );
  };

  const handleFileUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Photo must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      updateItem(itemId, "photoUrl", result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Boundary & Service Area Validation
    if (!serviceCheck.serviceable) {
      setErrorMsg(
        serviceCheck.reason ||
          "Your selected delivery address is outside the Calabar pilot service area. Checkout is disabled."
      );
      return;
    }

    // 2. Shopping list validation
    const invalidItem = items.find((i) => !i.name.trim());
    if (invalidItem) {
      setErrorMsg("Please specify a name for all items on your shopping list.");
      return;
    }

    // 3. Budget validation
    if (goodsBudgetNaira < 1000) {
      setErrorMsg("Minimum shopping budget is ₦1,000.");
      return;
    }

    if (spendingCapNaira < goodsBudgetNaira) {
      setErrorMsg("Approved spending limit must be equal to or greater than the goods budget.");
      return;
    }

    // 4. Shop location
    const shopName = shopType === "popular" ? currentMarket.name : customShopName.trim();
    const shopAddress = shopType === "popular" ? currentMarket.address : customShopAddress.trim();

    if (!shopName || !shopAddress) {
      setErrorMsg("Please provide the shop or market name and location.");
      return;
    }

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
            photoUrl: i.photoUrl,
          })),
          deliveryAddress: {
            label: activeAddress.label,
            streetAddress: activeAddress.streetAddress,
            city: activeAddress.city,
            latitude: activeAddress.latitude,
            longitude: activeAddress.longitude,
            zoneId: serviceCheck.zoneId,
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
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 w-full min-w-0 overflow-x-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2 sm:space-y-3">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-amber-100">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Calabar Pilot Concierge</span>
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Shop for Me — Calabar Personal Market Runner
          </h1>
          <p className="text-amber-100 max-w-2xl text-xs sm:text-sm sm:leading-relaxed">
            Need fresh foodstuffs from Watt Market, Marian Market, or groceries from SPAR Calabar Mall?
            Specify what you need, set your approved budget, and an assigned Nelo rider will procure and deliver directly to your doorstep.
          </p>
        </div>
      </div>

      {/* Error / Service Boundary Notification */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Unable to proceed with checkout</p>
            <p className="text-red-800 leading-normal">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Out of Service Boundary Banner if address is out of bounds */}
      {!serviceCheck.serviceable && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
          <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-900">Delivery Address Outside Calabar Pilot Service Zone</p>
            <p className="text-amber-800 leading-relaxed">
              {serviceCheck.reason ||
                "Nelo is currently conducting its pilot within Calabar Municipal and Calabar South. Addresses outside this perimeter cannot be serviced at this time."}
            </p>
            <p className="text-[11px] text-amber-700 font-medium pt-1">
              Please choose a delivery location in Calabar Municipal (e.g. State Housing, Marian, UNICAL) or Calabar South (Watt, Target, Bedwell) below.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {/* Step 1: Select Delivery Destination FIRST (enforces area filtering) */}
        <section className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-amber-100 text-amber-800 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
                1
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Where should we deliver your purchases?
              </h2>
            </div>
            <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
              Calabar Pilot Perimeter
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customerAddresses.map((addr) => {
              const isSelected = selectedAddressId === addr.id;
              const addrCheck = isCalabarServiceable(addr);

              return (
                <label
                  key={addr.id}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between gap-2 relative ${
                    isSelected
                      ? addrCheck.serviceable
                        ? "border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-500"
                        : "border-red-400 bg-red-50/40 ring-1 ring-red-400"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="delivery_address"
                      value={addr.id}
                      checked={isSelected}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {addr.label}
                        </span>
                        {addrCheck.serviceable ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {addrCheck.zoneName}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-800 bg-red-100 px-1.5 py-0.5 rounded">
                            Out of Area
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 break-words">
                        {addr.streetAddress}
                      </p>
                      {addr.notes && (
                        <p className="text-[11px] text-amber-800 font-medium mt-1">
                          {addr.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              General Delivery & Gate Access Notes (Optional)
            </label>
            <input
              type="text"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="e.g. Call at estate security gate; leave with security guard if not home"
              className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </section>

        {/* Step 2: Pick Shop / Market (Filtered to locations serving delivery area) */}
        <section className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-amber-100 text-amber-800 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Where should the rider shop in Calabar?
                </h2>
                <p className="text-xs text-slate-500">
                  Showing verified locations that can deliver to your area
                </p>
              </div>
            </div>

            <div className="inline-flex self-start sm:self-auto bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setShopType("popular")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  shopType === "popular"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Verified Calabar Markets
              </button>
              <button
                type="button"
                onClick={() => setShopType("custom")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  shopType === "custom"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Custom Store / Landmark
              </button>
            </div>
          </div>

          {shopType === "popular" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {serviceableMarkets.map((market) => {
                const isSelected = selectedMarketId === market.id;
                return (
                  <div
                    key={market.id}
                    onClick={() => setSelectedMarketId(market.id)}
                    className={`p-3.5 sm:p-4 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? "border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-500"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                        <Store className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {market.shortName}
                          </h4>
                          {isSelected && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {market.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {market.highlights.slice(0, 2).map((h) => (
                        <span
                          key={h}
                          className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                        >
                          {h}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      <span className="font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                        {market.zoneName}
                      </span>
                      <span>Verified Merchant</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Shop / Store Name in Calabar *
                </label>
                <input
                  type="text"
                  required
                  value={customShopName}
                  onChange={(e) => setCustomShopName(e.target.value)}
                  placeholder="e.g. Mama Caro Provisions or Highway Supermarket"
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Shop Street Address or Landmark *
                </label>
                <input
                  type="text"
                  required
                  value={customShopAddress}
                  onChange={(e) => setCustomShopAddress(e.target.value)}
                  placeholder="e.g. Beside First Bank, Marian Road, Calabar"
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}
        </section>

        {/* Step 3: Shopping List Items with Optional Item Photos */}
        <section className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-amber-100 text-amber-800 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  What items should the rider purchase?
                </h2>
                <p className="text-xs text-slate-500">
                  Add optional photos so your rider buys exactly what you want
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Item #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-red-500 p-1 transition"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Responsive item inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Item Name & Variety *
                    </label>
                    <input
                      type="text"
                      required
                      value={item.name}
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                      placeholder="e.g. Afang leaves, Oron crayfish, Yam tubers"
                      className="w-full text-xs sm:text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:contents gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
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
                        className="w-full text-xs sm:text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Unit / Measure
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                        className="w-full text-xs sm:text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="item">Piece / Item</option>
                        <option value="bunch">Bunch (Leaves / Plantains)</option>
                        <option value="derica">Derica (Tin)</option>
                        <option value="paint_rubber">Paint Rubber (Basket)</option>
                        <option value="bottle">Bottle (Palm Oil)</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="carton">Carton / Pack</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                    placeholder="Specific instructions (e.g. Brand, size, dry or fresh, clip tails)"
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Optional Item Photo Attachment */}
                <div className="pt-1 border-t border-slate-200/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Camera className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        Item Photo (Optional)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* File upload button */}
                      <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg transition shadow-2xs">
                        <Upload className="h-3 w-3 text-slate-500" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(item.id, e)}
                        />
                      </label>

                      {/* Sample photo presets dropdown for rapid pilot testing */}
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            updateItem(item.id, "photoUrl", e.target.value);
                          }
                        }}
                        defaultValue=""
                        className="text-[11px] font-medium bg-white border border-slate-300 text-slate-600 px-2 py-1 rounded-lg focus:outline-none"
                      >
                        <option value="" disabled>
                          Or pick sample item...
                        </option>
                        {CALABAR_ITEM_PHOTO_PRESETS.map((p) => (
                          <option key={p.name} value={p.url}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Photo Preview if attached */}
                  {item.photoUrl && (
                    <div className="mt-2.5 flex items-center gap-3 bg-white p-2 rounded-xl border border-amber-200 w-fit">
                      <img
                        src={item.photoUrl}
                        alt="Item Reference"
                        className="h-14 w-14 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-slate-800 block">
                          Photo Reference Attached
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Rider will use this to verify item in-store
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItem(item.id, "photoUrl", undefined)}
                          className="text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1"
                        >
                          <X className="h-3 w-3" /> Remove photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Step 4: Approved Spending Limit & Substitution Rules */}
        <section className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-amber-100 text-amber-800 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
              4
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Approved Spending Limit & Safeguards
              </h2>
              <p className="text-xs text-slate-500">
                You control the budget limit. Riders never advance funds or exceed this ceiling without your approval.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Estimated Physical Goods Budget (₦) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-500">₦</span>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  required
                  value={goodsBudgetNaira}
                  onChange={(e) =>
                    setGoodsBudgetNaira(Math.max(1000, parseInt(e.target.value) || 0))
                  }
                  className="w-full pl-8 pr-3 py-2 text-sm sm:text-base font-bold rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Your estimated cost for the shopping list items.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-amber-950">
                  Approved Spending Limit (₦) *
                </label>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Ceiling Cap
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-500">₦</span>
                <input
                  type="number"
                  min={goodsBudgetNaira}
                  step={500}
                  required
                  value={spendingCapNaira}
                  onChange={(e) =>
                    setSpendingCapNaira(Math.max(goodsBudgetNaira, parseInt(e.target.value) || 0))
                  }
                  className="w-full pl-8 pr-3 py-2 text-sm sm:text-base font-bold rounded-lg border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-amber-900">
                Maximum authorized spend. Any quote exceeding this triggers mandatory one-tap customer approval.
              </p>
            </div>
          </div>

          {/* Substitution Rules */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              If an item is out of stock in the market:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: "CALL_CUSTOMER",
                  title: "Ask customer first",
                  desc: "Rider submits proposed substitution for your approval",
                },
                {
                  id: "RIDER_BEST_JUDGMENT",
                  title: "Rider best judgment",
                  desc: "Rider selects equivalent quality if within approved limit",
                },
                {
                  id: "DO_NOT_SUBSTITUTE",
                  title: "Skip item",
                  desc: "Do not substitute; leave out unavailable items and refund",
                },
              ].map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => setSubstitutionPreference(sub.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    substitutionPreference === sub.id
                      ? "border-amber-600 bg-amber-50/60 ring-1 ring-amber-500"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{sub.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">{sub.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Summary, Transparent Fees & Action */}
        <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Approved Budget & Authorization</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Held securely in Nelo Escrow. Rider does not collect cash. Any unspent balance is refunded instantly.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[11px] text-slate-400 block uppercase font-medium">
                Initial Payment Hold
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-400">
                ₦{totalAuthorizationNaira.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[11px]">Goods Purchasing Budget</span>
              <span className="text-sm sm:text-base font-bold text-white mt-0.5 block">
                ₦{goodsBudgetNaira.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Approved ceiling: ₦{spendingCapNaira.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[11px]">Personal Shopper Concierge</span>
              <span className="text-sm sm:text-base font-bold text-white mt-0.5 block">
                ₦{conciergeFeeNaira.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Procurement, vetting & packaging
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[11px]">Calabar City Delivery</span>
              <span className="text-sm sm:text-base font-bold text-white mt-0.5 block">
                ₦{deliveryFeeNaira.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                To {activeAddress?.label || "your address"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Nelo Escrow Protection • Admin transfers directly to shop</span>
            </div>

            <button
              type="submit"
              disabled={isPending || !serviceCheck.serviceable}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition active:scale-95 ${
                !serviceCheck.serviceable
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-400 text-slate-950"
              }`}
            >
              {isPending
                ? "Submitting Calabar Request..."
                : !serviceCheck.serviceable
                ? "Address Outside Service Area"
                : "Authorize & Request Runner"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
