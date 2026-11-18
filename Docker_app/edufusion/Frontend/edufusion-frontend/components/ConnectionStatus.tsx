"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

// FR-05: tell the student whether the device is online or offline.
export default function ConnectionStatus() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online === null) return null;
  const Icon = online ? Wifi : WifiOff;
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium"
    >
      <span className={`h-2 w-2 rounded-full ${online ? "bg-ok" : "bg-muted"}`} aria-hidden />
      <Icon size={14} aria-hidden />
      {online ? "Online mode" : "Offline mode: local AI only"}
    </span>
  );
}
