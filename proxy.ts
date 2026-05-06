import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

const allowedRoles = ["admin", "consultant", "staff"];

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { sessionClaims, userId } = await auth();

    if (!sessionClaims || !userId) {
      const signInUrl = new URL("/sign-in", req.url);
      const safeRedirect = req.nextUrl.pathname + req.nextUrl.search;
      signInUrl.searchParams.set("redirect_url", safeRedirect);
      return NextResponse.redirect(signInUrl);
    }

    const userRole = sessionClaims?.metadata?.role as string;

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL("/not-allowed", req.url));
    }

    const path = req.nextUrl.pathname;

    const adminConsultantOnly =
      path.startsWith("/dashboard/new-order") ||
      path.startsWith("/dashboard/workflow");

    if (adminConsultantOnly && userRole !== "admin" && userRole !== "consultant") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/dashboard/staff") && userRole !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
