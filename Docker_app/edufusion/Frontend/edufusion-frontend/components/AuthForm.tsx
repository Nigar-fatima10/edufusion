"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { authRequest, saveSession } from "@/lib/auth";

type Errors = Partial<Record<"name" | "email" | "password" | "form", string>>;
const inputCls = "mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isReg = mode === "register";
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");

    const errs: Errors = {};
    if (isReg && !name) errs.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Enter a valid email, like alex@university.edu.";
    if (!password) errs.password = "Enter your password.";
    else if (isReg && !(password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)))
      errs.password = "Use at least 8 characters, with a letter and a number.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      saveSession(await authRequest(mode, { name, email, password }));
      router.push("/dashboard");
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong. Try again." });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-sm">
      <h1 className="text-3xl font-bold tracking-tight">{isReg ? "Start learning smarter" : "Sign in to continue"}</h1>
      <p className="mb-8 mt-2 text-sm text-muted">
        {isReg ? "Set up your private AI learning workspace in seconds." : "Your materials and study progress are waiting."}
      </p>

      {errors.form && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger">
          {errors.form}
        </p>
      )}

      {isReg && (
        <div className="mb-4">
          <label htmlFor="name" className="text-sm font-medium">Full name</label>
          <input id="name" name="name" autoComplete="name" aria-invalid={!!errors.name} className={inputCls} />
          {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="email" className="text-sm font-medium">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} className={inputCls} />
        {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
      </div>

      <div className="mb-6">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete={isReg ? "new-password" : "current-password"}
            aria-invalid={!!errors.password}
            className={`${inputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 p-1 text-muted hover:text-ink"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-accent py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Please wait…" : isReg ? "Create my account" : "Sign in"}
      </button>

      <p className="mt-5 text-center text-sm text-muted">
        {isReg ? "Already have an account? " : "New to EduFusion? "}
        <Link href={isReg ? "/login" : "/register"} className="font-semibold text-ink underline">
          {isReg ? "Sign in" : "Create account"}
        </Link>
      </p>
    </form>
  );
}
