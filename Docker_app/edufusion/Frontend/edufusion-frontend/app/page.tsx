import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const STEPS = ["Review key concepts", "Explore the visual diagram", "Take a 5-question quiz"];

export default function WelcomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="text-lg font-bold tracking-tight">
          EduFusion <span className="text-accent">AI</span>
        </span>
        <nav className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="px-2 text-sm font-medium text-muted hover:text-ink">Sign in</Link>
          <Link href="/register" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">Get started</Link>
        </nav>
      </header>

      <main className="grid flex-1 items-center gap-12 py-12 md:grid-cols-2">
        <div>
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Learn without limits, <span className="text-accent">online or offline.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">
            One workspace for your notes, quizzes, code and study plans. It runs on your device first and uses
            the cloud only when you allow it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-lg bg-accent px-6 py-3 font-semibold text-accent-ink">Start learning free</Link>
            <Link href="/dashboard" className="rounded-lg border border-line bg-surface px-6 py-3 font-semibold">Explore dashboard</Link>
          </div>
          <p className="mt-6 text-sm text-muted">Private by design · 9 learning tools · Works offline</p>
        </div>

        <div className="rounded-2xl bg-navy p-6 text-white shadow-xl md:p-8">
          <p className="text-xs text-white/60">AI study session</p>
          <h2 className="mt-1 text-2xl font-bold">Neural networks</h2>
          <p className="mt-1 text-sm text-white/60">Your local AI built a focused 25-minute lesson.</p>
          <ol className="mt-6 space-y-2">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3 text-sm font-medium">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-ink">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
