import { authMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk middleware protects all routes by default.
 * Public routes (home, sign‑in/up, static assets) are whitelisted.
 */
export default authMiddleware({
  publicRoutes: ["/", "/sign-in", "/sign-up", "/api/public/*"],
});

export const config = {
  matcher: [
    // Apply middleware to everything except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
