import Link from "next/link";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <header className="border-b border-border/40 py-4">
        <div className="container max-w-2xl mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="font-semibold text-lg">
            Genzer
          </Link>
          <span className="text-sm text-muted-foreground">创建你的名片</span>
        </div>
      </header>
      <main className="flex-1 container max-w-2xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
