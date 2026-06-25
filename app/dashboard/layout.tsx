import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import Link from "next/link";
import { Globe, LayoutDashboard } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border flex flex-col gap-2 px-3 py-4 shrink-0">
        <div className="px-2 py-2 mb-2">
          <span className="text-lg font-semibold tracking-tight">Lead Hub</span>
        </div>

        <nav className="flex flex-col gap-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LayoutDashboard size={16} />
            Overview
          </Link>
          <Link
            href="/dashboard/websites"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Globe size={16} />
            Websites
          </Link>
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-2">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/dashboard/websites"
            afterSelectOrganizationUrl="/dashboard/websites"
          />
          <UserButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
