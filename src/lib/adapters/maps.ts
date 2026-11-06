/**
 * Maps and Geolocation Adapter for Nelo
 * Calculates Nigerian zone distances, routes, and coordinates without requiring external paid API keys.
 */

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface RouteEstimate {
  distanceKm: number;
  estimatedDurationMinutes: number;
  fareBreakdown: {
    baseFareKobo: number;
    distanceFareKobo: number;
    totalFareKobo: number;
  };
}

// Popular Nigerian hub coordinates for fast reference & realistic mocking
export const NIGERIAN_PRESETS: Record<string, GeoCoordinate> = {
  VI_LAGOS: { latitude: 6.4281, longitude: 3.4219, label: "Victoria Island, Lagos" },
  LEKKI_PHASE_1: { latitude: 6.4474, longitude: 3.4735, label: "Lekki Phase 1, Lagos" },
  IKOYI_LAGOS: { latitude: 6.4549, longitude: 3.4357, label: "Ikoyi, Lagos" },
  BALOGUN_MARKET: { latitude: 6.4578, longitude: 3.3855, label: "Balogun Market, Lagos Island" },
  IKEJA_GRA: { latitude: 6.5901, longitude: 3.3515, label: "Ikeja GRA, Lagos Mainland" },
  YABA_TECH: { latitude: 6.5167, longitude: 3.3721, label: "Yaba, Lagos Mainland" },
  WUSE_2_ABUJA: { latitude: 9.0765, longitude: 7.4721, label: "Wuse 2, Abuja" },
  MAITAMA_ABUJA: { latitude: 9.0882, longitude: 7.4933, label: "Maitama, Abuja" },
};

/**
 * Calculates Haversine distance between two latitude/longitude points in kilometers
 */
export function calculateHaversineDistanceKm(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDist = R * c;

  // Add 25% road curvature factor for Nigerian urban street networks
  const roadDistance = rawDist * 1.25;
  return Math.max(1.2, Math.round(roadDistance * 10) / 10);
}

/**
 * Estimates duration and fare for an urban delivery
 */
export function estimateRoute(
  pickup: { latitude: number; longitude: number },
  dropoff: { latitude: number; longitude: number },
  baseFareKobo = 120000, // ₦1,200 base
  perKmRateKobo = 15000, // ₦150 per km
  surgeMultiplier = 1.0
): RouteEstimate {
  const distanceKm = calculateHaversineDistanceKm(pickup, dropoff);

  // Lagos / Abuja traffic speed estimate: 18 km/h in city plus 10 min buffer
  const durationMins = Math.round((distanceKm / 18) * 60 + 10);

  const distanceFareKobo = Math.round(distanceKm * perKmRateKobo);
  const totalFareKobo = Math.round((baseFareKobo + distanceFareKobo) * surgeMultiplier);

  return {
    distanceKm,
    estimatedDurationMinutes: durationMins,
    fareBreakdown: {
      baseFareKobo,
      distanceFareKobo,
      totalFareKobo,
    },
  };
}
