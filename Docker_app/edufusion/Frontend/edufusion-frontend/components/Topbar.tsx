"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";
import ConnectionStatus from "./ConnectionStatus";
import ThemeToggle from "./ThemeToggle";

export default function Topbar() {
  const [initials, setInitials] = useState("");

  useEffect(() => {
    const name = getSession()?.name ?? "";
    setInitials(name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase());
  }, []);

  return (
    <header className="flex items-center gap-3 border-b border-line px-5 py-3 md:px-10">
      <label className="relative max-w-sm flex-1">
        <span className="sr-only">Search materials</span>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          placeholder="Search materials, chats, notes"
          className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm placeholder:text-muted"
        />
      </label>
      <div className="ml-auto flex items-center gap-3">
        <ConnectionStatus />
        <ThemeToggle />
        <span
          aria-label="Your account"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink"
        >
          {initials}
        </span>
      </div>
    </header>
  );
}
