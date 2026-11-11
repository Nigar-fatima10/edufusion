"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

// FR-49: nothing in the app is usable before login.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (getSession()) setOk(true);
    else router.replace("/login");
  }, [router]);

  return ok ? <>{children}</> : null;
}
