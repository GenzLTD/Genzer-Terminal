import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
          <div className="flex gap-4 items-center font-semibold">
            <Link href="/">Genzer</Link>
            <Link
              href="/discover"
              className="text-primary"
            >
              发现
            </Link>
          </div>
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense>
              <AuthButton />
            </Suspense>
          )}
        </div>
      </nav>
      <main className="flex-1 w-full max-w-5xl mx-auto p-5">{children}</main>
      <footer className="w-full flex justify-center border-t py-8">
        <ThemeSwitcher />
      </footer>
    </div>
  );
}
