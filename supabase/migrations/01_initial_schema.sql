-- =========================================================================
-- Nelo Delivery Platform — Supabase PostgreSQL Schema & Row Level Security
-- Production deployment migration for Supabase & Vercel
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enum Types
CREATE TYPE user_role AS ENUM (
  'CUSTOMER',
  'VENDOR_OWNER',
  'VENDOR_STAFF',
  'RIDER',
  'DISPATCHER',
  'SUPPORT_AGENT',
  'FINANCE_OPERATOR',
  'ADMIN'
);

CREATE TYPE service_type AS ENUM (
  'MARKETPLACE',
  'SHOP_FOR_ME',
  'PACKAGE'
);

CREATE TYPE order_status AS ENUM (
  'DRAFT',
  'QUOTED',
  'AWAITING_PAYMENT',
  'PLACED',
  'VENDOR_ACCEPTED',
  'AWAITING_RIDER',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'DECLINED',
  'CANCELLED',
  'PAYMENT_FAILED',
  'DELIVERY_EXCEPTION',
  'RETURNED',
  'REFUNDED'
);

-- 2. Core Tables
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Lagos',
  state TEXT NOT NULL DEFAULT 'Lagos State',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  delivery_instructions TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Lagos',
  base_fare_kobo INTEGER NOT NULL DEFAULT 120000,
  per_km_rate_kobo INTEGER NOT NULL DEFAULT 15000,
  surge_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  max_package_weight_kg DOUBLE PRECISION NOT NULL DEFAULT 25.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'FOOD',
  logo_url TEXT,
  banner_url TEXT,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Lagos',
  state TEXT NOT NULL DEFAULT 'Lagos State',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  zone_id UUID NOT NULL REFERENCES public.service_zones(id),
  is_verified BOOLEAN NOT NULL DEFAULT true,
  is_open BOOLEAN NOT NULL DEFAULT true,
  rating DOUBLE PRECISION NOT NULL DEFAULT 4.8,
  prep_time_minutes INTEGER NOT NULL DEFAULT 25,
  commission_percent DOUBLE PRECISION NOT NULL DEFAULT 12.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendor_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MANAGER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_vendor_user UNIQUE(vendor_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.catalog_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.catalog_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_kobo INTEGER NOT NULL,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  preparation_time_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rider_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employment_type TEXT NOT NULL DEFAULT 'FREELANCE',
  vehicle_type TEXT NOT NULL DEFAULT 'MOTORCYCLE',
  plate_number TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  is_online BOOLEAN NOT NULL DEFAULT false,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  rating DOUBLE PRECISION NOT NULL DEFAULT 4.9,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  wallet_balance_kobo INTEGER NOT NULL DEFAULT 0,
  active_zone_id UUID REFERENCES public.service_zones(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.users(id),
  service_type service_type NOT NULL,
  status order_status NOT NULL DEFAULT 'DRAFT',
  zone_id UUID NOT NULL REFERENCES public.service_zones(id),
  vendor_id UUID REFERENCES public.vendors(id),
  currency TEXT NOT NULL DEFAULT 'NGN',
  subtotal_kobo INTEGER NOT NULL DEFAULT 0,
  delivery_fee_kobo INTEGER NOT NULL DEFAULT 0,
  service_fee_kobo INTEGER NOT NULL DEFAULT 0,
  surge_fee_kobo INTEGER NOT NULL DEFAULT 0,
  tip_kobo INTEGER NOT NULL DEFAULT 0,
  total_amount_kobo INTEGER NOT NULL DEFAULT 0,
  pickup_address_json JSONB NOT NULL,
  dropoff_address_json JSONB NOT NULL,
  cancellation_reason TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES public.rider_profiles(id),
  status TEXT NOT NULL DEFAULT 'PENDING_DISPATCH',
  pickup_time TIMESTAMPTZ,
  delivery_time TIMESTAMPTZ,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 35,
  distance_km DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  proof_type TEXT NOT NULL DEFAULT 'PIN_AND_PHOTO',
  proof_notes TEXT,
  proof_photo_url TEXT,
  verified_pin TEXT,
  rider_earnings_kobo INTEGER NOT NULL DEFAULT 0,
  dispatcher_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dispatch_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES public.rider_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'OFFERED',
  offered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  response_reason TEXT,
  estimated_earnings_kobo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.ledger_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  balance_kobo BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id),
  debit_account_id UUID NOT NULL REFERENCES public.ledger_accounts(id),
  credit_account_id UUID NOT NULL REFERENCES public.ledger_accounts(id),
  amount_kobo INTEGER NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  is_compensating BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_resource TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  metadata_json JSONB,
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- 3. Row Level Security (RLS) Configuration
-- Critical boundary enforcement:
-- - Customers can ONLY see their own orders.
-- - Operations staff only can access dispatch, finance, and audit.
-- - Vendors only see orders destined for their store.
-- - Riders only see orders they are assigned to or offered.
-- =========================================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Get authenticated user's role from public.users
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS: Orders Table
CREATE POLICY customer_view_own_orders ON public.orders
  FOR SELECT
  USING (
    customer_id = auth.uid() OR
    public.current_user_role() IN ('DISPATCHER', 'SUPPORT_AGENT', 'FINANCE_OPERATOR', 'ADMIN')
  );

CREATE POLICY customer_insert_own_orders ON public.orders
  FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
  );

CREATE POLICY vendor_view_vendor_orders ON public.orders
  FOR SELECT
  USING (
    vendor_id IN (
      SELECT vendor_id FROM public.vendor_staff WHERE user_id = auth.uid()
    )
  );

-- RLS: Deliveries Table
CREATE POLICY rider_view_assigned_delivery ON public.deliveries
  FOR SELECT
  USING (
    rider_id IN (
      SELECT id FROM public.rider_profiles WHERE user_id = auth.uid()
    ) OR
    public.current_user_role() IN ('DISPATCHER', 'SUPPORT_AGENT', 'FINANCE_OPERATOR', 'ADMIN')
  );

-- RLS: Operations Ledger & Audit (Staff Only!)
CREATE POLICY staff_only_ledger ON public.ledger_entries
  FOR SELECT
  USING (
    public.current_user_role() IN ('FINANCE_OPERATOR', 'ADMIN')
  );

CREATE POLICY staff_only_audit_logs ON public.audit_logs
  FOR SELECT
  USING (
    public.current_user_role() IN ('DISPATCHER', 'SUPPORT_AGENT', 'ADMIN')
  );
