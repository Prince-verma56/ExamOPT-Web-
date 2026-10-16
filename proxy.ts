import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Next.js 16 Proxy Boundary
 * Enforces clean, human-friendly authentication URLs (/sign-in and /sign-up)
 * without large encoded ?redirect_url=... query strings.
 */
export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const { pathname } = request.nextUrl;

  // 1. Cleanly alias legacy routes to standard auth routes
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  if (pathname === "/register") {
    return NextResponse.redirect(new URL("/sign-up", request.url));
  }

  // 2. If already authenticated and visiting sign-in or sign-up, redirect straight to admin
  if (userId && (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // 3. If unauthenticated and attempting to visit admin, redirect cleanly to /sign-in (unless demo mode is permitted)
  const isDemoAllowed = process.env.FEATURE_DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
  if (!userId && !isDemoAllowed && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
