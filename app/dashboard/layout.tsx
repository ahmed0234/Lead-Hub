import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Globe, LayoutDashboard, Inbox, Settings } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border flex flex-col gap-2 px-3 py-4 shrink-0 bg-card">
        <div className="px-3 py-2 mb-4">
          <span className="text-xl font-bold tracking-tight text-foreground">Lead Hub</span>
        </div>

        <nav className="flex flex-col gap-1.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LayoutDashboard size={17} />
            Overview
          </Link>
          <Link
            href="/dashboard/websites"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Globe size={17} />
            Websites
          </Link>
          <Link
            href="/dashboard/leads"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Inbox size={17} />
            Leads
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Settings size={17} />
            Settings & API Docs
          </Link>
        </nav>

        <div className="mt-auto flex items-center justify-between px-3 pt-4 border-t border-border gap-2">
          <span className="text-xs text-muted-foreground font-medium truncate">My Account</span>
          <UserButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8 bg-muted/20">{children}</main>
    </div>
  );
}
