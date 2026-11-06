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

export const DEMO_USERS = [
  {
    email: "chioma@nelo.ng",
    role: "CUSTOMER" as UserRole,
    name: "Chioma Adeleke",
    title: "Customer (Lagos)",
    description: "Can order food, shop for me, send packages, and track own orders",
  },
  {
    email: "babatunde@yellowchilli.ng",
    role: "VENDOR_OWNER" as UserRole,
    name: "Chef Babatunde (Yellow Chilli)",
    title: "Vendor Owner (VI, Lagos)",
    description: "Accepts orders, updates prep status, manages menu",
  },
  {
    email: "emeka.rider@nelo.ng",
    role: "RIDER" as UserRole,
    name: "Emeka Obi",
    title: "Freelance Rider (Motorcycle)",
    description: "Receives offers, accepts race-protected deliveries, updates delivery stages",
  },
  {
    email: "folake.dispatch@nelo.ng",
    role: "DISPATCHER" as UserRole,
    name: "Folake Daniels",
    title: "Ops Dispatcher (Staff Only)",
    description: "Monitors active fleet, manually reassigns deliveries with audit reasons",
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
