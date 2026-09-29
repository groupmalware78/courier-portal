import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

// Edge-safe base config (no Node-only providers here — see auth.ts for the
// Credentials provider, which needs bcrypt/Prisma and cannot run in middleware).
export const authConfig = {
  // Without this, Auth.js resolves relative redirects (e.g. signOut's
  // callbackUrl) against the fixed NEXTAUTH_URL env var instead of the
  // request's actual Host header — so signing out while connected via a
  // LAN IP would redirect to localhost instead of that IP. Safe here since
  // this app isn't behind an untrusted reverse proxy that could spoof Host.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isPublic = path === "/" || path === "/login" || path === "/signup";
      const isOnAdminOnly = path.startsWith("/admin");
      const isOnCsrOnly = path.startsWith("/csr");
      // Despite the URL, this path is reached by DRIVER (their own
      // deliveries) and ADMIN/CSR (the all-deliveries/assign view) — see
      // canViewDeliveriesPage in lib/rbac.ts, which this mirrors.
      const isOnDeliveriesPage = path.startsWith("/driver");
      const isOnPackagesOnly = path.startsWith("/packages");
      const isOnCustomersOnly = path.startsWith("/customers");

      // A one-time-password account must set a real password before doing
      // anything else — redirect everywhere else in the app to that page.
      if (isLoggedIn && auth.user.mustChangePassword && path !== "/force-password-change") {
        return NextResponse.redirect(new URL("/force-password-change", request.url));
      }

      if (isOnAdminOnly) return isLoggedIn && auth.user.role === "ADMIN";
      if (isOnCsrOnly) return isLoggedIn && (auth.user.role === "ADMIN" || auth.user.role === "CSR");
      if (isOnDeliveriesPage)
        return (
          isLoggedIn &&
          (auth.user.role === "ADMIN" || auth.user.role === "CSR" || auth.user.role === "DRIVER")
        );
      if (isOnPackagesOnly)
        return (
          isLoggedIn &&
          (auth.user.role === "ADMIN" ||
            auth.user.role === "CSR" ||
            auth.user.role === "DRIVER" ||
            auth.user.role === "LOGGER")
        );
      if (isOnCustomersOnly) return isLoggedIn && (auth.user.role === "ADMIN" || auth.user.role === "CSR");

      if (!isPublic) return isLoggedIn;

      // Already-logged-in visitors to /login or /signup are redirected to
      // their role's home route by those pages' own server components
      // (which know per-role routing) — not here, so that logic isn't
      // duplicated or overridden.
      return true;
    },
    // Auth.js's default redirect callback prefixes a relative callbackUrl
    // (e.g. "/login", used by every signOut()/signIn() call in this app)
    // with a server-computed "baseUrl" — which we found resolves to the
    // fixed NEXTAUTH_URL env var even with trustHost set, not the request's
    // actual Host. next-auth/react's signIn()/signOut() always send an
    // ABSOLUTE callbackUrl (window.location.href) — when connected over a
    // LAN IP that's a different origin than baseUrl, so the naive "does
    // url's origin match baseUrl" check below (Auth.js's own default logic)
    // fails and silently redirects back to the unreachable
    // NEXTAUTH_URL/localhost instead. trustHost:true already means "trust
    // whatever Host this server is reached on"; every redirect target this
    // app ever produces is one of its own pages either way (relative, or
    // absolute from this same app's own window.location.href), so honor it
    // outright instead of re-validating it against the stale baseUrl.
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return url;
      try {
        new URL(url);
        return url;
      } catch {
        return baseUrl;
      }
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
