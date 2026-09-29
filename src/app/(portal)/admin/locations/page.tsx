import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { LocationsView } from "@/components/LocationsView";

export default async function AdminLocationsPage() {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    redirect("/login");
  }

  const { locations } = await apiClient.locations.list();

  return <LocationsView initialLocations={locations} />;
}
