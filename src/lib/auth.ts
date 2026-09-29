import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { isApiError, API_KEY_PROBLEM_FRIENDLY_MESSAGE } from "@/lib/apiErrors";
import { authConfig } from "./auth.config";
import { apiClient } from "./apiClient";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Distinguishes "this deployment's own API key is broken" from an
// ordinary wrong email/password — thrown instead of returning null so
// LoginForm can tell the two apart via signIn()'s result.code and show a
// "contact your system administrator" message instead of implying the
// user themselves typed something wrong. `code` is safe to expose (per
// CredentialsSignin's own doc comment) since it names a category, not a
// specific account or credential.
class ApiKeyProblemSignin extends CredentialsSignin {
  code = "api-key-problem";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        try {
          const { user } = await apiClient.auth.login(email, password);
          if (!user.active) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
          };
        } catch (err) {
          if (isApiError(err)) {
            // A broken deployment-level API key (see apiErrors.ts) is not
            // the signed-in user's fault — surface it distinctly instead
            // of the generic "invalid credentials" null.
            if (err.message === API_KEY_PROBLEM_FRIENDLY_MESSAGE) throw new ApiKeyProblemSignin();
            // Ordinary invalid credentials (401) or tenant not configured
            // — NextAuth expects null rather than a thrown error here.
            return null;
          }
          throw err;
        }
      },
    }),
  ],
});
