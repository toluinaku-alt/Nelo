"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  Scale,
  Sparkles,
} from "lucide-react";
import { createPackageOrderAction } from "@/lib/actions";

interface SendPackageClientProps {
  customerAddresses: {
    id: string;
    label: string;
    streetAddress: string;
    city: string;
    latitude: number;
    longitude: number;
  }[];
  defaultSenderName: string;
  defaultSenderPhone: string;
}

const PACKAGE_CATEGORIES = [
  { id: "DOCUMENTS", name: "Documents & Contracts", icon: "📄" },
  { id: "ELECTRONICS", name: "Electronics & Gadgets", icon: "💻" },
  { id: "CLOTHING", name: "Clothing & Fashion", icon: "👗" },
  { id: "PERISHABLES", name: "Food & Perishables", icon: "🍲" },
  { id: "MEDICINE", name: "Pharmaceuticals / Health", icon: "💊" },
  { id: "PARCEL", name: "General Carton / Merchandise", icon: "📦" },
];

export function SendPackageClient({
  customerAddresses,
  defaultSenderName,
  defaultSenderPhone,
}: SendPackageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Pickup Details
  const [pickupAddress, setPickupAddress] = useState(
    customerAddresses[0]?.streetAddress || "14 Admiralty Way, Lekki Phase 1"
  );
  const [pickupCity, setPickupCity] = useState("Lagos");
  const [senderName, setSenderName] = useState(defaultSenderName || "Chioma Adeleke");
  const [senderPhone, setSenderPhone] = useState(defaultSenderPhone || "+234 803 123 4567");

  // Dropoff Details
  const [dropoffAddress, setDropoffAddress] = useState(
    "Plot 12A Karimu Kotun, Victoria Island"
  );
  const [dropoffCity, setDropoffCity] = useState("Lagos");
  const [recipientName, setRecipientName] = useState("Chinedu Okeke");
  const [recipientPhone, setRecipientPhone] = useState("+234 812 987 6543");

  // Package attributes
  const [category, setCategory] = useState("ELECTRONICS");
  const [weightKg, setWeightKg] = useState<number>(3);
  const [dimensions, setDimensions] = useState("Medium Shoebox (30x20x15cm)");
  const [isFragile, setIsFragile] = useState(false);
  const [instructions, setInstructions] = useState("");

  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fare estimation calculation
  // Base ₦1,200 + ₦150/km (estimated 8km = ₦1,200) + weight surcharge if >5kg (₦200/kg) + ₦200 platform fee
  const estimatedKm = 8.5;
  const baseFareNaira = 1200;
  const distanceFareNaira = Math.round(estimatedKm * 150);
  const weightSurchargeNaira = weightKg > 5 ? (weightKg - 5) * 200 : 0;
  const serviceFeeNaira = 200;
  const totalFareNaira =
    baseFareNaira + distanceFareNaira + weightSurchargeNaira + serviceFeeNaira;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      setErrorMsg("Please provide both complete pickup and dropoff addresses.");
      return;
    }
    if (!recipientName.trim() || !recipientPhone.trim()) {
      setErrorMsg("Recipient contact name and phone number are required.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createPackageOrderAction({
          pickupAddress: {
            label: "Sender Pickup",
            streetAddress: pickupAddress,
            city: pickupCity,
            contactName: senderName,
            contactPhone: senderPhone,
            latitude: 6.4474,
            longitude: 3.4735,
          },
          dropoffAddress: {
            label: "Recipient Dropoff",
            streetAddress: dropoffAddress,
            city: dropoffCity,
            contactName: recipientName,
            contactPhone: recipientPhone,
            latitude: 6.4281,
            longitude: 3.4219,
          },
          packageCategory: category,
          weightKg,
          dimensionsCm: dimensions,
          isFragile,
          deliveryInstructions: instructions,
        });

        if (result.success) {
          setGeneratedPin(result.securityPin || null);
          setCreatedOrderNumber(result.orderNumber);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to create courier booking.");
      }
    });
  };

  if (createdOrderNumber && generatedPin) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 text-center">
        <div className="h-16 w-16 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Booking Confirmed
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Package Courier Dispatched!
          </h2>
          <p className="text-sm text-slate-500">
            Order Reference: <strong className="text-slate-800 font-mono">{createdOrderNumber}</strong>
          </p>
        </div>

        {/* Security Handoff PIN Card */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-lg space-y-3">
          <div className="flex items-center justify-center gap-2 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <KeyRound className="h-4 w-4" />
            Recipient Delivery Verification PIN
          </div>
          <div className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-amber-400 py-2">
            {generatedPin}
          </div>
          <p className="text-xs text-blue-200 max-w-md mx-auto leading-relaxed">
            Share this 4-digit PIN with <strong>{recipientName}</strong> ({recipientPhone}).
            The rider cannot complete delivery without entering this code into the rider terminal.
          </p>
        </div>

        <div className="pt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => router.push(`/orders`)}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow transition"
          >
            Track in My Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-blue-100">
            <Package className="h-3.5 w-3.5" />
            Point-to-Point Express Courier
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Send a Package Across Town
          </h1>
          <p className="text-blue-100 max-w-2xl text-sm sm:text-base leading-relaxed">
            Fast, secure intracity dispatch across Lagos and Abuja. Featuring automated rider allocation, 
            transparent distance pricing, and mandatory recipient 4-digit PIN verification.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to process courier request</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Pickup Location & Sender */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center">
              1
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Pickup Location & Sender Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pickup Address / Landmark *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Street address, building name, landmark"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sender Contact Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sender Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Dropoff Location & Recipient */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center">
              2
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Drop-off Destination & Recipient Verification
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination Address / Landmark *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  placeholder="Recipient full address, estate name, house number"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recipient Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Chinedu Okeke"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recipient Phone Number (For PIN confirmation) *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+234 812 000 0000"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: Package Category & Dimensions */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center">
              3
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Package Specification & Handling
            </h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Select Package Category:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PACKAGE_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                    category === cat.id
                      ? "border-blue-600 bg-blue-50/60 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Estimated Weight (kg)
                </label>
                <span className="text-xs font-extrabold text-blue-700">
                  {weightKg} kg
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={25}
                value={weightKg}
                onChange={(e) => setWeightKg(parseInt(e.target.value) || 1)}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Packages above 5kg have a ₦200/kg motorcycle surcharge.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Approximate Size
              </label>
              <select
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Small Pouch (Documents / Envelope)">
                  Small Pouch (Documents / Envelope)
                </option>
                <option value="Medium Shoebox (30x20x15cm)">
                  Medium Shoebox (30x20x15cm)
                </option>
                <option value="Large Carton (50x40x30cm)">
                  Large Carton (50x40x30cm)
                </option>
              </select>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFragile}
                  onChange={(e) => setIsFragile(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Handle with Care (Fragile items / Glass / Screens)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Delivery or Gate Instructions (Optional)
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Please call before arriving at the security barrier"
              className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        {/* Price Breakdown & Submission */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-bold">Fare Breakdown & Instant Dispatch</h3>
              <p className="text-xs text-slate-400 mt-1">
                Direct rider assignment via Nelo First-Valid-Acceptance engine.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block uppercase font-medium">
                Total Courier Fare
              </span>
              <span className="text-3xl font-black text-blue-400">
                ₦{totalFareNaira.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-slate-400 block">Base Pickup Fare</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                ₦{baseFareNaira.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-slate-400 block">Estimated Distance (~8.5km)</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                ₦{distanceFareNaira.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-slate-400 block">Weight Surcharge</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                ₦{weightSurchargeNaira.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-slate-400 block">Service & Insurance</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                ₦{serviceFeeNaira.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Includes 4-digit PIN handoff verification</span>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              {isPending ? "Booking Courier..." : "Book & Dispatch Courier"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
