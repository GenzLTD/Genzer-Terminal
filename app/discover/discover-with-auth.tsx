import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { redirect } from "next/navigation";
import { DiscoverPage } from "@/components/discover/discover-page";

export async function DiscoverPageWithAuth() {
  if (!hasEnvVars) {
    redirect("/auth/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <DiscoverPage userId={user.id} />;
}
