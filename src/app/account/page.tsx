import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  User,
  MapPin,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  Building,
  Phone,
  Mail,
  Plus,
} from "lucide-react";

export const metadata = {
  title: "My Account — Nelo Nigeria",
  description: "Customer profile, saved Nigerian addresses, and payment methods.",
};

export default async function AccountPage() {
  const user = await getCurrentUser();

  const addresses = await prisma.customerAddress.findMany({
    where: { userId: user?.id },
    orderBy: { isDefault: "desc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-nelo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
            {user?.fullName?.charAt(0) || "C"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {user?.fullName || "Chioma Adeleke"}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-nelo-100 text-nelo-800 px-2.5 py-0.5 rounded-full">
                {user?.role || "CUSTOMER"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              {user?.email}
              {(user as any)?.phone && (
                <>
                  <span>•</span>
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {(user as any).phone}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="text-right sm:text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Nelo ID
          </span>
          <span className="font-mono text-xs font-semibold text-slate-600">
            {user?.id ? `${user.id.substring(0, 16)}...` : "NELO-CUST-001"}
          </span>
        </div>
      </div>

      {/* Saved Delivery Addresses */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-nelo-600" />
              Saved Nigerian Delivery Addresses
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Addresses used for automatic delivery fare calculations and rapid checkout.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.length > 0 ? (
            addresses.map((addr) => (
              <div
                key={addr.id}
                className={`p-4 rounded-2xl border transition ${
                  addr.isDefault
                    ? "border-nelo-500 bg-nelo-50/30 shadow-sm"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900">
                    {addr.label}
                  </span>
                  {addr.isDefault && (
                    <span className="text-[10px] font-bold uppercase bg-nelo-600 text-white px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {addr.streetAddress}
                </p>
                <p className="text-[11px] font-medium text-slate-500 mt-1">
                  {addr.city}, {addr.state}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  Coordinates: {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}
                </p>
              </div>
            ))
          ) : (
            <div className="sm:col-span-2 p-6 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
              No saved addresses found. Default addresses will be generated during order creation.
            </div>
          )}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Payment Methods & Integration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nigerian Naira (NGN) cards, Paystack mock sandbox, and wallet balances.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Paystack Sandbox Integration
              </span>
              <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                Active Mock Mode
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Simulates Nigerian Mastercard, Visa, and Verve card checkouts with zero actual bank charge.
            </p>
            <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs font-mono font-bold text-slate-800">•••• •••• •••• 4081</p>
                <p className="text-[10px] text-slate-400">Expires 12/28 • Test Card</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Direct Bank Transfer & USSD
              </span>
              <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                Supported
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Supports virtual NUBAN accounts (Zenith Bank, GTBank, Kuda) for instant Nigerian transfers.
            </p>
            <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-3">
              <Building className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-800">Providus / Zenith Virtual NUBAN</p>
                <p className="text-[10px] text-slate-400">Account: 9928192019 • Auto-credit</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
