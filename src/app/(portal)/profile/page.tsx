import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { ROLE_LABELS } from "@/lib/rbac";
import { getPortalSettings } from "@/lib/settings";
import { ProfileForm } from "@/components/ProfileForm";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { EmailVerifiedBadge } from "@/components/profile/EmailVerifiedBadge";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { PersonalInfoTab } from "@/components/profile/PersonalInfoTab";
import { AddressTab } from "@/components/profile/AddressTab";
import { AuthorizedPickupTab } from "@/components/profile/AuthorizedPickupTab";
import { formatPhoneDisplay } from "@/lib/phoneFormat";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonthYear(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = await apiClient.portalUsers.get(session.user.id);
  if (!user) redirect("/login");

  const createdAt = new Date(user.createdAt);

  if (user.role !== "CUSTOMER") {
    return (
      <div className="max-w-lg space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
          <p className="text-sm text-slate-500">Manage your account details.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-5 grid grid-cols-2 gap-4 border-b border-slate-100 pb-5 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</p>
              <p className="mt-1 text-slate-700">{user.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Role</p>
              <p className="mt-1 text-slate-700">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <ProfileForm initialName={user.name} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Change password</h2>
          <ChangePasswordForm />
        </div>
      </div>
    );
  }

  const [settings, { customer }, { people: authorizedPickups }] = await Promise.all([
    getPortalSettings(),
    apiClient.customers.byEmail(user.email ?? ""),
    apiClient.authorizedPickups.list(session.user.id),
  ]);

  const hasWarehouseAddress = !!(settings.warehouseName || settings.warehouseAddressLine1);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account Profile</h1>
        <p className="text-sm text-slate-500">Manage your account details.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Left summary card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
          <div
            className="flex flex-col items-center gap-3 px-6 py-8 text-center"
            style={{
              background: `linear-gradient(to bottom right, ${settings.gradientFrom}, ${settings.gradientVia}, ${settings.gradientTo})`,
            }}
          >
            <AvatarUpload
              initialUrl={user.avatarImageFileName ? "/api/profile/avatar" : null}
              name={user.name}
            />
            <h2 className="text-lg font-semibold text-white">{user.name}</h2>
            {customer?.customerCode && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                ID {customer.customerCode}
              </span>
            )}
          </div>

          <div className="space-y-4 p-5 text-sm">
            <h3 className="text-sm font-semibold text-slate-900">Account Details</h3>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <EmailVerifiedBadge verified={user.emailVerified} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Email</span>
              <span className="truncate text-slate-900">{user.email}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Phone</span>
              <span className="text-slate-900">{user.phone ? formatPhoneDisplay(user.phone) : "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Location</span>
              <span className="truncate text-slate-900">
                {[user.cityParish, user.country].filter(Boolean).join(", ") || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Member Since</span>
              <span className="text-slate-900">{formatMonthYear(createdAt)}</span>
            </div>
          </div>

          {hasWarehouseAddress && (
            <div className="border-t border-slate-100 p-5 text-sm">
              <h3 className="text-sm font-semibold text-slate-900">Your Shipping Address</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Use this when shopping online — packages are received here.
              </p>
              <address className="mt-3 not-italic text-slate-700">
                {settings.warehouseName && <p className="font-medium">{settings.warehouseName}</p>}
                {settings.warehouseAddressLine1 && <p>{settings.warehouseAddressLine1}</p>}
                {settings.warehouseAddressLine2 && <p>{settings.warehouseAddressLine2}</p>}
                {(settings.warehouseCity || settings.warehouseState || settings.warehouseZip) && (
                  <p>
                    {[settings.warehouseCity, settings.warehouseState, settings.warehouseZip]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                {settings.warehouseCountry && <p>{settings.warehouseCountry}</p>}
                {settings.warehousePhone && (
                  <p className="mt-1 text-slate-500">{formatPhoneDisplay(settings.warehousePhone)}</p>
                )}
                {customer?.customerCode && (
                  <p className="mt-2 text-xs text-slate-400">
                    Include your customer ID ({customer.customerCode}) on address line 2 so it can
                    be matched to your account.
                  </p>
                )}
              </address>
            </div>
          )}
        </div>

        {/* Right tabbed panel */}
        <ProfileTabs
          personalInfo={
            <PersonalInfoTab
              initialFirstName={user.firstName ?? ""}
              initialLastName={user.lastName ?? ""}
              initialPhone={user.phone ?? ""}
              initialStoreLocation={user.storeLocation ?? ""}
              email={user.email ?? ""}
              emailVerified={user.emailVerified}
            />
          }
          address={
            <AddressTab
              initialAddressLine1={user.addressLine1 ?? ""}
              initialAddressLine2={user.addressLine2 ?? ""}
              initialCityParish={user.cityParish ?? ""}
              initialCountry={user.country ?? ""}
              emailVerified={user.emailVerified}
            />
          }
          security={
            <div className="max-w-md">
              <h2 className="text-lg font-semibold text-slate-900">Security</h2>
              <p className="mb-4 text-sm text-slate-500">Change your account password.</p>
              <ChangePasswordForm />
            </div>
          }
          authorizedPickup={<AuthorizedPickupTab initialPeople={authorizedPickups} />}
          gradientFrom={settings.gradientFrom}
          gradientVia={settings.gradientVia}
          gradientTo={settings.gradientTo}
        />
      </div>
    </div>
  );
}
