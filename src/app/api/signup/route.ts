import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isApiError } from "@/lib/apiErrors";
import { apiClient } from "@/lib/apiClient";
import { passwordSchema } from "@/lib/passwordSchema";
import { sendSignupVerificationEmail } from "@/lib/emailVerification";
import { PHONE_FORMAT_REGEX } from "@/lib/phoneFormat";

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const optionalTrimmed = (max: number) =>
  z.preprocess(asString, z.string().trim().max(max).optional());
const optionalPhone = () =>
  z.preprocess(
    asString,
    z
      .string()
      .trim()
      .max(30)
      .optional()
      .refine((v) => !v || PHONE_FORMAT_REGEX.test(v), {
        message: "Enter a phone number in the format +1 (000) 000-0000",
      })
  );

const signupSchema = z
  .object({
    firstName: z.preprocess(asString, z.string().trim().min(1, "First name is required").max(75)),
    middleInitial: z.preprocess(asString, z.string().trim().min(1, "Middle initial is required").max(3)),
    lastName: z.preprocess(asString, z.string().trim().min(1, "Last name is required").max(75)),
    email: z.preprocess(asString, z.string().trim().min(1, "Email is required").email("Enter a valid email address")),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    phone: z.preprocess(
      asString,
      z
        .string()
        .trim()
        .min(1, "Phone is required")
        .max(30)
        .refine((v) => PHONE_FORMAT_REGEX.test(v), {
          message: "Enter a phone number in the format +1 (000) 000-0000",
        })
    ),
    workPhone: optionalPhone(),
    addressLine1: z.preprocess(asString, z.string().trim().min(1, "Address line 1 is required").max(150)),
    addressLine2: optionalTrimmed(150),
    cityParish: z.preprocess(asString, z.string().trim().min(1, "City / parish is required").max(100)),
    country: z.preprocess(asString, z.string().trim().min(1, "Country is required").max(100)),
    trn: z.preprocess(asString, z.string().trim().min(1, "TRN is required").max(20)),
    storeLocation: optionalTrimmed(150),
    agreeToTerms: z.boolean().refine((v) => v === true, {
      message: "You must agree to the Terms and Conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const {
    firstName,
    middleInitial,
    lastName,
    email,
    password,
    phone,
    workPhone,
    addressLine1,
    addressLine2,
    cityParish,
    country,
    trn,
    storeLocation,
  } = parsed.data;

  try {
    const { user, customerCode, emailVerificationToken } = await apiClient.portalUsers.signup({
      firstName,
      middleInitial,
      lastName,
      email,
      password,
      phone,
      workPhone: workPhone || undefined,
      addressLine1,
      addressLine2: addressLine2 || undefined,
      cityParish,
      country,
      trn,
      storeLocation: storeLocation || undefined,
    });

    await sendSignupVerificationEmail(user, emailVerificationToken, { customerCode });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
