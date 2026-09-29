import type { PortalRole } from "@/lib/apiTypes";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: PortalRole;
    mustChangePassword: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: PortalRole;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: PortalRole;
    mustChangePassword: boolean;
  }
}

// "next-auth/jwt" re-exports its JWT type from "@auth/core/jwt" via `export *`,
// which does not participate in declaration merging — augment the source too.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: PortalRole;
    mustChangePassword: boolean;
  }
}
