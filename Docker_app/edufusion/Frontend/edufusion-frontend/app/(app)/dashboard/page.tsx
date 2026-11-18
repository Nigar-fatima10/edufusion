"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, MessageSquare } from "lucide-react";
import { getSession } from "@/lib/auth";
import { READY, TOOLS } from "@/lib/routes";
import { RECENT_MATERIALS, TODAY_FOCUS } from "@/lib/mock";

export default function DashboardPage() {
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    setName(getSession()?.name.split(" ")[0] ?? "");
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const chatReady = READY.has("/chat");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting}
            {name && `, ${name}`}
          </h1>
          <p className="mt-1 text-muted">What would you like to learn today?</p>
        </div>
        {chatReady ? (
          <Link href="/chat" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink">
            <MessageSquare size={16} /> Start AI chat
          </Link>
        ) : (
          <span aria-disabled="true" className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-accent/40 px-4 py-2.5 text-sm font-semibold text-accent-ink">
            <MessageSquare size={16} /> Start AI chat
          </span>
        )}
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold text-muted">AI learning tools</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map(({ href, label, hint, icon: Icon }) => {
          const ready = READY.has(href);
          const inner = (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Icon size={20} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block truncate text-xs text-muted">{ready ? hint : "Coming soon"}</span>
              </span>
            </>
          );
          const cls = "flex items-center gap-3 rounded-xl border border-line bg-surface p-3";
          return (
            <li key={href}>
              {ready ? (
                <Link href={href} className={`${cls} transition-colors hover:border-accent`}>{inner}</Link>
              ) : (
                <div aria-disabled="true" className={`${cls} opacity-60`}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="recent" className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <h2 id="recent" className="font-semibold">Recent materials</h2>
            <Link href="/materials" className="text-sm font-medium text-accent">View all</Link>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {RECENT_MATERIALS.map((m) => (
              <li key={m.name} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted">{m.meta}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${m.status === "Ready" ? "bg-ok/15 text-ok" : "bg-accent/15 text-accent"}`}>
                  {m.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="focus" className="rounded-xl bg-navy p-5 text-white">
          <h2 id="focus" className="font-semibold">Today&rsquo;s focus</h2>
          <p className="mt-1 text-xs text-white/60">
            {TODAY_FOCUS.filter((t) => t.done).length} of {TODAY_FOCUS.length} done
          </p>
          <ul className="mt-4 space-y-2">
            {TODAY_FOCUS.map((t) => (
              <li key={t.title} className="flex items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-white/60">{t.meta}</p>
                </div>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${t.done ? "border-transparent bg-ok text-navy" : "border-white/40"}`}>
                  {t.done && <Check size={12} aria-label="Done" />}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
