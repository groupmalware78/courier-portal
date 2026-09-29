import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
  matcher: [
    "/admin/:path*",
    "/csr/:path*",
    "/driver/:path*",
    "/packages/:path*",
    "/customers/:path*",
    "/my-shipments/:path*",
    "/profile/:path*",
    "/force-password-change",
    "/login",
    "/signup",
  ],
};
