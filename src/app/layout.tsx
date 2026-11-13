import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Nelo — Nigerian On-Demand Delivery & Logistics Platform",
  description:
    "Marketplace Food & Groceries, Shop for Me concierge, and Courier Package Delivery in Lagos & Abuja.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fallback demo cookie logic (kept for dev environment only)
  const cookieStore = cookies();
  const currentEmail = cookieStore.get("nelo_active_user")?.value || "chioma@nelo.ng";

  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body className="font-sans antialiased bg-slate-50 text-slate-900 min-h-screen flex flex-col">
          {/* Navbar – displayed for all authenticated users */}
          <Navbar />

          {/* Main Content */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 font-medium text-slate-700">
                <span className="h-5 w-5 rounded bg-nelo-600 text-white font-bold inline-flex items-center justify-center text-xs">
                  N
                </span>
                <span>Nelo Delivery Platform (Nigeria)</span>
              </div>
              <p>
                Built with Next.js App Router, Supabase, Prisma ORM, and double-entry minor unit kobo ledger.
              </p>
              <div className="flex items-center gap-4 text-slate-400">
                <span>Lagos • Abuja</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">Production Mode</span>
              </div>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
