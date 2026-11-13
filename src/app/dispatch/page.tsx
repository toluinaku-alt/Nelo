import { requireRole } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Dispatcher Dashboard — Nelo",
  description: "Internal staff view for dispatching riders and monitoring deliveries.",
};

export default async function DispatchDashboardPage() {
  // Enforce Dispatcher role only
  await requireRole(["DISPATCHER"] as any);
  const user = await getCurrentUser();

  return (
    <main className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Dispatcher Dashboard</h1>
      <p className="text-gray-600">
        Welcome, {user?.fullName || "Dispatcher"}. This area will provide tools to assign riders, monitor order progress, and communicate with customers.
      </p>
      {/* Placeholder – future UI components go here */}
    </main>
  );
}
