import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { hasEnvVars } from "@/lib/utils";

const signedOut = (
  <div className="flex gap-2">
    <Button asChild size="sm" variant={"outline"}>
      <Link href="/auth/login">Sign in</Link>
    </Button>
    <Button asChild size="sm" variant={"default"}>
      <Link href="/auth/sign-up">Sign up</Link>
    </Button>
  </div>
);

export async function AuthButton() {
  if (!hasEnvVars) return signedOut;

  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant="ghost">
        <Link href="/discover">发现</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/onboarding">创建名片</Link>
      </Button>
      <LogoutButton />
    </div>
  ) : (
    signedOut
  );
}
