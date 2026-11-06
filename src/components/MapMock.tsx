"use client";

import { MapPin, Navigation, Bike, CheckCircle2 } from "lucide-react";

interface MapMockProps {
  pickupAddress?: string;
  dropoffAddress?: string;
  distanceKm?: number;
  riderName?: string;
  status: string;
  pickup?: { name?: string; address?: string; latitude?: number; longitude?: number };
  dropoff?: { name?: string; address?: string; latitude?: number; longitude?: number };
  riderCoordinates?: { latitude?: number; longitude?: number };
}

export function MapMock({
  pickupAddress,
  dropoffAddress,
  distanceKm = 5.5,
  riderName,
  status,
  pickup,
  dropoff,
  riderCoordinates,
}: MapMockProps) {
  const isDelivered = status === "DELIVERED";
  const isInTransit = status === "IN_TRANSIT" || status === "PICKED_UP";

  const resolvedPickup = pickup?.name || pickup?.address || pickupAddress || "Pickup Point";
  const resolvedDropoff = dropoff?.name || dropoff?.address || dropoffAddress || "Drop-off Destination";

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner h-64 sm:h-72 w-full flex flex-col justify-between p-4">
      {/* Background Graphic Grid */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Top Banner */}
      <div className="relative z-10 flex items-center justify-between text-xs bg-slate-800/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700 text-slate-200">
        <div className="flex items-center gap-2">
          <Navigation className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
          <span className="font-semibold text-emerald-300">Live Delivery Route</span>
          <span className="text-slate-400">({distanceKm} km)</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          {riderName ? `Rider: ${riderName}` : "Active Corridor"}
        </div>
      </div>

      {/* Center Simulated Path Graphic */}
      <div className="relative z-10 flex items-center justify-around my-auto px-4">
        {/* Pickup Node */}
        <div className="flex flex-col items-center text-center max-w-[130px]">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-lg">
            <MapPin className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-emerald-300 mt-2 truncate max-w-full">
            {resolvedPickup}
          </span>
        </div>

        {/* Animated Connecting Line */}
        <div className="flex-1 max-w-xs mx-4 relative flex items-center justify-center">
          <div className="w-full border-t-2 border-dashed border-emerald-500/40 relative" />
          {isInTransit && (
            <div className="absolute animate-pulse bg-amber-500 text-slate-950 p-1.5 rounded-full shadow-lg border border-white">
              <Bike className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Dropoff Node */}
        <div className="flex flex-col items-center text-center max-w-[130px]">
          <div
            className={`h-10 w-10 rounded-full border-2 flex items-center justify-center shadow-lg ${
              isDelivered
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-400"
                : "bg-blue-500/20 border-blue-400 text-blue-400"
            }`}
          >
            {isDelivered ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <MapPin className="h-5 w-5" />
            )}
          </div>
          <span
            className={`text-[11px] font-medium mt-2 truncate max-w-full ${
              isDelivered ? "text-emerald-300" : "text-blue-300"
            }`}
          >
            {resolvedDropoff}
          </span>
        </div>
      </div>

      {/* Bottom Status Ticker */}
      <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Lagos GPS Hub • Simulated Live Telemetry
        </span>
        <span className="font-mono text-emerald-400 font-bold uppercase">
          {status}
        </span>
      </div>
    </div>
  );
}
