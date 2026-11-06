# Nelo — Nigerian On-Demand Logistics & Delivery Platform

**Nelo** is a production-minded delivery platform designed for an initial launch in Nigeria (Lagos & Abuja). Built with **Next.js 14 (App Router), TypeScript, Prisma ORM, Supabase PostgreSQL with Row Level Security (RLS), and deployed on Vercel**.

Nelo unifies three equally important services into one cohesive platform:
1. **Marketplace Delivery**: Customers order food and groceries from verified local vendors (e.g. Yellow Chilli in Victoria Island, Mega Chicken in Lekki, Hubmart Stores in Ikeja).
2. **Shop for Me (Concierge Runner)**: Customers ask a dedicated rider to buy specific items from any open-air market or unlisted local store (e.g. Balogun Market, Mile 12, Wuse Market Abuja), featuring distinct goods budgets, substitution preferences, and receipt reconciliation.
3. **Package Courier**: Point-to-point express intracity parcel delivery featuring distance-based pricing, weight surcharges, and mandatory 4-digit recipient verification PINs.

---

## 🏗️ System Architecture & Audience Boundaries

```mermaid
flowchart TD
    subgraph Clients["Client Access Layers"]
        CustApp["Customer Web App / PWA<br/>(Marketplace, Shop for Me, Courier, Own Orders Tracking)"]
        VendorPortal["Protected Vendor Portal<br/>(Menu Availability, Prep Stages, Payout Ledger)"]
        RiderApp["Rider Mobile Terminal<br/>(Offer Broadcaster, PIN Verification, Reconciliation)"]
        OpsDashboard["Internal Central Operations (Staff Only)<br/>(Dispatch Board, Fleet Map, Finance Ledger, Auditing)"]
    end

    subgraph Security["Server-Side Authorization & RLS"]
        AuthBoundary["Role-Based Middleware & Server Guard<br/>(requireStaff, requireRole)"]
        SupabaseRLS["Supabase Row Level Security<br/>(Customer Isolation, Staff Clearance)"]
    end

    subgraph CoreEngine["Nelo Application Core"]
        DispatchEngine["Atomic Dispatch Engine<br/>(First-Valid-Acceptance Race Protection)"]
        LedgerService["Double-Entry Minor Unit Kobo Ledger<br/>(Immutable Debits/Credits, Escrow & Compensating Refunds)"]
        Adapters["Service Adapters<br/>(Paystack Mock, OSM Map Telemetry, SMS/Push Gateway)"]
    end

    CustApp --> AuthBoundary
    VendorPortal --> AuthBoundary
    RiderApp --> AuthBoundary
    OpsDashboard --> AuthBoundary

    AuthBoundary --> DispatchEngine
    AuthBoundary --> LedgerService
    AuthBoundary --> Adapters
    AuthBoundary --> SupabaseRLS
```

### 🔒 Critical Audience & Security Boundaries
- **Strict Staff-Only Boundary**: Customers and external users can **never** access the internal operations dashboard (`/ops`), live fleet supply maps, dispatcher override tools, vendor administration, or financial ledger data. This boundary is enforced on the server (`requireStaff()`) and backed by Supabase RLS policies—never rely solely on hidden frontend buttons.
- **Customer Isolation**: Customers can place requests and inspect **only their own** orders and tracking timelines. Attempting to query another customer's order triggers an explicit 403 Forbidden.
- **Rider Privacy Protection**: Detailed customer telephone numbers and full drop-off street addresses remain shielded from riders until a delivery offer has been successfully and atomically claimed.

---

## ⚡ Key Features

### 1. Three Core Services
- **Marketplace**: Verified vendors with catalog browsing, single-vendor carts, kitchen prep tracking, and delivery dispatch.
- **Shop for Me**: Itemized shopping lists with units (Derica, Paint rubber, Kg, Bunch), distinct Goods Budget held in Escrow, Maximum Spending Caps, substitution rules (`Call me first`, `Rider best judgment`, `Skip item`), and post-shopping receipt reconciliation.
- **Package Courier**: Dimensional & weight checks (>5kg surcharge), recipient contact verification, and cryptographic 4-digit handoff PIN verification.

### 2. Race-Protected Dispatch Engine (First-Valid-Acceptance-Wins)
- Offers are broadcast to eligible nearby riders within the active delivery zone.
- Acceptance requests are executed inside an atomic database transaction.
- If multiple riders click "Accept" simultaneously, the conditional update claims the delivery for the first recorder, marks competing offers as `MISSED`, and alerts late applicants gracefully with an idempotent response.

### 3. Double-Entry Accounting in Integer Minor Units (Nigerian Kobo)
- All monetary amounts across the platform are stored as integer minor units (`100 Kobo = ₦1 NGN`) to prevent floating-point rounding errors.
- Double-entry ledger accounts:
  - `CUSTOMER_WALLET`: Customer funding source
  - `VENDOR_PAYABLE`: Accrued vendor food/grocery proceeds
  - `RIDER_PAYABLE`: Accrued rider distance fares & concierge tips
  - `PLATFORM_FEES`: Nelo platform commissions and service margins
  - `ESCROW_GOODS`: Pre-authorized shopping budget held during runner procurement
  - `REFUND_CLEARING`: Cleared compensating customer refund amounts
- Financial ledger entries are **immutable and append-only**. Customer cancellations or staff adjustments record **compensating ledger entries** rather than mutating historical rows.

### 4. Mandatory Audit Trail
- Privileged operations such as manual rider reassignment and customer refunds require a **mandatory audit rationale** (minimum 5 characters) and record the operator identity and timestamp to the immutable `AuditLog` table.

---

## 👥 Demo Personas & Fast Role Switcher

A floating persona switcher at the top of the interface enables instant evaluation of all 7 personas:

| Persona | Name | Role | Primary Experience |
| :--- | :--- | :--- | :--- |
| **Customer** | Chioma Adeleke | `CUSTOMER` | Place orders, Shop for Me, Send Package, Track own deliveries |
| **Vendor Owner** | Chef Babatunde | `VENDOR_OWNER` | Manage Yellow Chilli menu items, accept orders, prep handoff |
| **Rider** | Emeka Obi | `RIDER` | Receive offers, atomic acceptance, PIN delivery confirmation |
| **Dispatcher** | Folake Daniels | `DISPATCHER` | Live dispatch board, fleet view, reassignment with audit reason |
| **Finance Operator** | Ngozi Eze | `FINANCE_OPERATOR` | Review double-entry trial balance, process compensating refunds |
| **Support Agent** | Ibrahim Musa | `SUPPORT_AGENT` | Order dispute handling, delivery exception logging |
| **Administrator** | Kolawole Johnson | `ADMIN` | Full operational clearance, zones, system configuration |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.17+ or 20+
- npm or pnpm

### 1. Clone & Install Dependencies
```bash
cd nelo
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default local `.env` is configured for SQLite out-of-the-box:
```env
DATABASE_URL="file:./dev.db"
DIRECT_URL=""
NEXT_PUBLIC_SUPABASE_URL="https://nelo-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NELO_ENV="development"
MOCK_SERVICES="true"
PAYSTACK_PUBLIC_KEY="pk_test_nelo_mock_key"
PAYSTACK_SECRET_KEY="sk_test_nelo_mock_key"
PAYSTACK_WEBHOOK_SECRET="whsec_nelo_mock_secret"
MOCK_SMS_PROVIDER="true"
MOCK_PUSH_PROVIDER="true"
NEXT_PUBLIC_MAPS_PROVIDER="mock_osm"
```

### 3. Initialize Database & Seed Demo Data
```bash
# Push schema to local database
npx prisma db push

# Seed realistic Nigerian vendors, zones, catalog items, and ledger accounts
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Supabase PostgreSQL & Production Migration

For production deployment on Supabase:

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Retrieve your PostgreSQL connection strings (Transaction pooler for `DATABASE_URL` and Direct for `DIRECT_URL`).
3. In your `.env`:
   ```env
   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
   ```
4. Apply the production SQL migration with Row Level Security:
   - Run the script in `supabase/migrations/01_initial_schema.sql` inside the Supabase SQL Editor.
   - Or run `npx prisma db push --schema=prisma/schema.supabase.prisma`.
5. Run the seed script:
   ```bash
   node scripts/seed.mjs
   ```

---

## ☁️ Vercel Deployment

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Environment Variables in the Vercel Dashboard matching your production Supabase and Paystack credentials.
4. Set Build Command: `prisma generate && next build`.
5. Deploy.

---

## 🛡️ Sandbox & Integration Assumptions

- **Payment Adapter**: Runs in `MOCK_PAYSTACK` mode by default. All card transactions succeed immediately with simulated test references (`MOCK-MK-xxxx`) without charging real payment instruments. Real Paystack keys can be plugged in seamlessly via `src/lib/adapters/payment.ts`.
- **Maps & Telemetry**: Uses `mock_osm` with simulated coordinates centered on Lagos (Victoria Island, Lekki Phase 1, Ikeja, Lagos Island) and Abuja (Wuse, Maitama). Real Google Maps or Mapbox keys can be set in `src/lib/adapters/maps.ts`.
- **SMS & Dispatch Notifications**: Uses mock logging adapters (`src/lib/adapters/notification.ts`) to avoid external telecommunications charges during staging and reviewer evaluation.
