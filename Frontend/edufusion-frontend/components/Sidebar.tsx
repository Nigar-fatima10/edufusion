"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, FolderOpen, LayoutDashboard, LogOut, MessageSquare, Settings } from "lucide-react";
import { clearSession } from "@/lib/auth";
import { READY } from "@/lib/routes";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI chat", icon: MessageSquare },
  { href: "/materials", label: "My materials", icon: FolderOpen },
  { href: "/planner", label: "Study planner", icon: CalendarCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const base = "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium";

  return (
    <aside className="border-b border-line bg-surface md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
      <div className="px-5 py-4 md:py-6">
        <span className="text-lg font-bold tracking-tight">
          EduFusion <span className="text-accent">AI</span>
        </span>
      </div>

      <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
        {NAV.map(({ href, label, icon: Icon }) => {
          if (!READY.has(href)) {
            return (
              <span key={href} aria-disabled="true" className={`${base} cursor-not-allowed text-muted/60`}>
                <Icon size={18} />
                {label}
                <span className="ml-auto hidden text-xs md:inline">Soon</span>
              </span>
            );
          }
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`${base} transition-colors ${
                active ? "bg-accent/15 text-accent" : "text-muted hover:bg-bg hover:text-ink"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => {
          clearSession();
          router.push("/login");
        }}
        className={`${base} mx-3 mb-3 hidden text-muted transition-colors hover:text-ink md:flex`}
      >
        <LogOut size={18} />
        Sign out
      </button>
    </aside>
  );
}
