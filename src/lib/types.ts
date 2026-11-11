export type UserRole =
  | "CUSTOMER"
  | "VENDOR_OWNER"
  | "VENDOR_STAFF"
  | "RIDER"
  | "DISPATCHER"
  | "SUPPORT_AGENT"
  | "FINANCE_OPERATOR"
  | "ADMIN";

export type ServiceType = "MARKETPLACE" | "SHOP_FOR_ME" | "PACKAGE";

export type OrderStatus =
  | "DRAFT"
  | "QUOTED"
  | "AWAITING_PAYMENT"
  | "PLACED"
  | "VENDOR_ACCEPTED"
  | "AWAITING_RIDER"
  | "ASSIGNED"
  | "RIDER_AT_SHOP"
  | "QUOTE_SUBMITTED"
  | "CUSTOMER_APPROVAL_PENDING"
  | "SHOP_PAYMENT_PENDING"
  | "PICKUP_RELEASED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "DECLINED"
  | "CANCELLED"
  | "PAYMENT_FAILED"
  | "DELIVERY_EXCEPTION"
  | "RETURNED"
  | "REFUNDED";

export interface MoneyBreakdown {
  subtotalKobo: number;
  deliveryFeeKobo: number;
  serviceFeeKobo: number;
  surgeFeeKobo: number;
  tipKobo: number;
  totalAmountKobo: number;
}

/** Formats integer kobo into Nigerian Naira string e.g. 150000 -> "₦1,500.00" */
export function formatKoboToNaira(kobo: number, includeDecimals = true): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(naira);
}

/** Converts Naira to integer kobo safely */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

// ==========================================
// CALABAR PILOT CONSTANTS & LOCATIONS
// ==========================================

export interface CalabarMarket {
  id: string;
  name: string;
  shortName: string;
  category: "FOOD_MARKET" | "SUPERMARKET" | "SPECIALTY" | "WHOLESALE";
  address: string;
  zoneId: "zone-calabar-municipal" | "zone-calabar-south";
  zoneName: string;
  city: "Calabar";
  latitude: number;
  longitude: number;
  servesZones: ("zone-calabar-municipal" | "zone-calabar-south")[];
  highlights: string[];
  imageUrl?: string;
}

export const CALABAR_MARKETS: CalabarMarket[] = [
  {
    id: "mkt-watt-calabar",
    name: "Watt Market (Calabar South)",
    shortName: "Watt Market",
    category: "FOOD_MARKET",
    address: "Calabar Road & Bedwell St, Calabar South",
    zoneId: "zone-calabar-south",
    zoneName: "Calabar South",
    city: "Calabar",
    latitude: 4.9575,
    longitude: 8.3242,
    servesZones: ["zone-calabar-municipal", "zone-calabar-south"],
    highlights: ["Crayfish & Periwinkle", "Fresh Afang & Waterleaf", "Pure Palm Oil", "Dry Smoked Fish"],
    imageUrl: "/images/markets/watt-market.jpg",
  },
  {
    id: "mkt-marian-calabar",
    name: "Marian Market (Ika Ika Oqua Market)",
    shortName: "Marian Market",
    category: "FOOD_MARKET",
    address: "Marian Road (Ndidem Usang Iso Rd), Calabar Municipal",
    zoneId: "zone-calabar-municipal",
    zoneName: "Calabar Municipal",
    city: "Calabar",
    latitude: 4.9757,
    longitude: 8.3417,
    servesZones: ["zone-calabar-municipal", "zone-calabar-south"],
    highlights: ["Fresh Produce & Veggies", "Plantain Bunches", "Bulk Grains & Tubers", "Live Poultry"],
    imageUrl: "/images/markets/marian-market.jpg",
  },
  {
    id: "mkt-spar-calabar",
    name: "SPAR Calabar Mall (Cultural Centre)",
    shortName: "SPAR Calabar Mall",
    category: "SUPERMARKET",
    address: "Calabar Mall, Murtala Mohammed Highway, Calabar Municipal",
    zoneId: "zone-calabar-municipal",
    zoneName: "Calabar Municipal",
    city: "Calabar",
    latitude: 4.9680,
    longitude: 8.3361,
    servesZones: ["zone-calabar-municipal", "zone-calabar-south"],
    highlights: ["Packaged Groceries", "Bakery & Deli", "Frozen Meats & Fish", "Toiletries & Household"],
    imageUrl: "/images/markets/spar-calabar.jpg",
  },
  {
    id: "mkt-bedwell-hardware",
    name: "Bedwell Commercial & Hardware Hub",
    shortName: "Bedwell Hardware Hub",
    category: "SPECIALTY",
    address: "44 Bedwell Street, Calabar South",
    zoneId: "zone-calabar-south",
    zoneName: "Calabar South",
    city: "Calabar",
    latitude: 4.9560,
    longitude: 8.3225,
    servesZones: ["zone-calabar-municipal", "zone-calabar-south"],
    highlights: ["Electrical & Plumbing", "Tools & Hardware", "Motorcycle & Auto Parts"],
    imageUrl: "/images/markets/bedwell.jpg",
  },
  {
    id: "mkt-bogobiri-produce",
    name: "Bogobiri Grains & Spices Depot",
    shortName: "Bogobiri Depot",
    category: "WHOLESALE",
    address: "Bogobiri Street, Calabar Municipal",
    zoneId: "zone-calabar-municipal",
    zoneName: "Calabar Municipal",
    city: "Calabar",
    latitude: 4.9645,
    longitude: 8.3302,
    servesZones: ["zone-calabar-municipal", "zone-calabar-south"],
    highlights: ["Bags of Beans & Rice", "Northern Onions & Peppers", "Ginger, Garlic & Spices"],
    imageUrl: "/images/markets/bogobiri.jpg",
  },
  {
    id: "mkt-mbakpu-seafood",
    name: "Mbakpu Seafood Landing (Marina Waterfront)",
    shortName: "Marina Seafood Landing",
    category: "FOOD_MARKET",
    address: "Beach Road / Marina Waterfront, Calabar South",
    zoneId: "zone-calabar-south",
    zoneName: "Calabar South",
    city: "Calabar",
    latitude: 4.9490,
    longitude: 8.3180,
    servesZones: ["zone-calabar-municipal", "zone-calabar-south"],
    highlights: ["Fresh Marine Prawns & Crabs", "Live River Catfish", "Fresh Barracuda & Snapper"],
    imageUrl: "/images/markets/mbakpu.jpg",
  },
];

export interface CalabarPilotAddress {
  id: string;
  label: string;
  streetAddress: string;
  city: "Calabar";
  state: "Cross River State";
  zoneId: "zone-calabar-municipal" | "zone-calabar-south" | "OUT_OF_BOUNDS";
  zoneName: string;
  isServiceable: boolean;
  latitude: number;
  longitude: number;
  notes?: string;
}

export const CALABAR_PILOT_ADDRESSES: CalabarPilotAddress[] = [
  {
    id: "addr-calabar-state-housing",
    label: "Home (State Housing Estate)",
    streetAddress: "12 State Housing Estate, Marian Road",
    city: "Calabar",
    state: "Cross River State",
    zoneId: "zone-calabar-municipal",
    zoneName: "Calabar Municipal",
    isServiceable: true,
    latitude: 4.9757,
    longitude: 8.3417,
  },
  {
    id: "addr-calabar-unical",
    label: "Work (Near UNICAL Main Gate)",
    streetAddress: "Plot 8 Etta Agbor Road, University of Calabar Area",
    city: "Calabar",
    state: "Cross River State",
    zoneId: "zone-calabar-municipal",
    zoneName: "Calabar Municipal",
    isServiceable: true,
    latitude: 4.9532,
    longitude: 8.3496,
  },
  {
    id: "addr-calabar-target",
    label: "Family (Target Street)",
    streetAddress: "24 Target Street, off Calabar Road",
    city: "Calabar",
    state: "Cross River State",
    zoneId: "zone-calabar-south",
    zoneName: "Calabar South",
    isServiceable: true,
    latitude: 4.9589,
    longitude: 8.3241,
  },
  {
    id: "addr-calabar-odukpani-out",
    label: "Tinapa / Odukpani (Outside Pilot Boundary)",
    streetAddress: "Kilometre 8, Tinapa Free Zone Resort Road, Adiabo",
    city: "Calabar",
    state: "Cross River State",
    zoneId: "OUT_OF_BOUNDS",
    zoneName: "Outside Calabar Pilot Service Zone",
    isServiceable: false,
    latitude: 5.0420,
    longitude: 8.3180,
    notes: "Outside current pilot delivery perimeter. Courier expansion scheduled for Phase 2.",
  },
];

/**
 * Checks if a destination address is within the Calabar pilot service zone
 */
export function isCalabarServiceable(address: {
  streetAddress?: string;
  city?: string;
  zoneId?: string;
  latitude?: number;
  longitude?: number;
}): { serviceable: boolean; reason?: string; zoneId?: string; zoneName?: string } {
  // Check explicit zoneId
  if (address.zoneId === "OUT_OF_BOUNDS") {
    return {
      serviceable: false,
      reason: "This address (Tinapa / Odukpani corridor) is outside the current Calabar pilot service perimeter. We currently only serve Calabar Municipal and Calabar South.",
    };
  }

  const text = `${address.streetAddress || ""} ${address.city || ""}`.toLowerCase();

  // Known out-of-boundary locations
  if (
    text.includes("tinapa") ||
    text.includes("odukpani") ||
    text.includes("akamkpa") ||
    text.includes("biase") ||
    text.includes("creek town")
  ) {
    return {
      serviceable: false,
      reason: "This location is outside the active Calabar pilot zone. Nelo currently serves Calabar Municipal (Marian, State Housing, Federal Housing, UNICAL) and Calabar South (Watt, Target, Bedwell, Anantigha).",
    };
  }

  // Latitude / longitude boundary check (Rough Calabar Urban box: Lat 4.88 to 5.02, Lon 8.28 to 8.42)
  if (address.latitude && address.longitude) {
    if (address.latitude > 5.03 || address.latitude < 4.89 || address.longitude < 8.26 || address.longitude > 8.42) {
      return {
        serviceable: false,
        reason: "Location coordinates fall outside the Calabar pilot dispatch radius (Calabar Municipal & Calabar South).",
      };
    }
  }

  // Default within pilot zone
  const isSouth = text.includes("south") || text.includes("watt") || text.includes("target") || text.includes("bedwell") || text.includes("anantigha") || text.includes("chamley") || text.includes("marina");
  const zoneId = isSouth ? "zone-calabar-south" : "zone-calabar-municipal";
  const zoneName = isSouth ? "Calabar South" : "Calabar Municipal";

  return { serviceable: true, zoneId, zoneName };
}

// Sample photo presets for fast testing without uploading
export const CALABAR_ITEM_PHOTO_PRESETS = [
  { name: "Fresh Afang Leaves", url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300" },
  { name: "Oron Crayfish (Smoked)", url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=300" },
  { name: "Periwinkle in Shell", url: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=300" },
  { name: "Fresh Yellow Garri", url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300" },
  { name: "Red Palm Oil Bottle", url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300" },
  { name: "Ripe Calabar Plantains", url: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300" },
];

export const DEMO_USERS = [
  {
    email: "chioma@nelo.ng",
    role: "CUSTOMER" as UserRole,
    name: "Chioma Adeleke",
    title: "Customer (Calabar Pilot)",
    description: "Can order food, shop for me, send packages, and track own orders in Calabar",
  },
  {
    email: "babatunde@yellowchilli.ng",
    role: "VENDOR_OWNER" as UserRole,
    name: "Chef Bassey (Calabar Kitchen)",
    title: "Vendor Owner (Calabar)",
    description: "Accepts orders, updates prep status, manages menu",
  },
  {
    email: "emeka.rider@nelo.ng",
    role: "RIDER" as UserRole,
    name: "Emeka Obi",
    title: "Freelance Rider (Calabar Fleet)",
    description: "Receives offers, accepts race-protected deliveries, quotes shop items, handles handoffs",
  },
  {
    email: "folake.dispatch@nelo.ng",
    role: "DISPATCHER" as UserRole,
    name: "Folake Daniels",
    title: "Ops Dispatcher & Pilot Lead",
    description: "Monitors Calabar fleet, assigns responsible admin, reconciles shop payments",
  },
  {
    email: "ngozi.finance@nelo.ng",
    role: "FINANCE_OPERATOR" as UserRole,
    name: "Ngozi Eze",
    title: "Finance Operator (Staff Only)",
    description: "Audits integer kobo ledger, vendor/rider payouts, reconciliation",
  },
  {
    email: "ibrahim.support@nelo.ng",
    role: "SUPPORT_AGENT" as UserRole,
    name: "Ibrahim Musa",
    title: "Support Agent (Staff Only)",
    description: "Handles customer disputes, delivery exceptions, ticket logs",
  },
  {
    email: "admin@nelo.ng",
    role: "ADMIN" as UserRole,
    name: "Kolawole Johnson",
    title: "Platform Administrator (Staff Only)",
    description: "Full system administration, zones, audit trail, configuration",
  },
];

export const STAFF_ROLES: UserRole[] = [
  "DISPATCHER",
  "SUPPORT_AGENT",
  "FINANCE_OPERATOR",
  "ADMIN",
];
