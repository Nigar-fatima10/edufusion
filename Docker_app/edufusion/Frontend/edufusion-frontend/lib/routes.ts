import {
  CalendarCheck, Code2, FileText, ListChecks, MessageSquare, ScanSearch,
  StickyNote, UploadCloud, Workflow, type LucideIcon,
} from "lucide-react";

/** Teammates: add your route here when the page exists, and its cards/links switch on. */
export const READY = new Set<string>(["/dashboard", "/materials", "/summarize"]);

export type Tool = { href: string; label: string; hint: string; icon: LucideIcon };

// The 9 AI services from SRS 4.2.5 / SDS 6.1.
export const TOOLS: Tool[] = [
  { href: "/chat", label: "Ask AI", hint: "Get answers from your notes", icon: MessageSquare },
  { href: "/materials", label: "Upload material", hint: "PDF, audio, video and code", icon: UploadCloud },
  { href: "/summarize", label: "Summarize", hint: "Short, medium or detailed", icon: FileText },
  { href: "/notes", label: "Smart notes", hint: "Headings, bullets, keywords", icon: StickyNote },
  { href: "/quiz", label: "Generate quiz", hint: "Test what you know", icon: ListChecks },
  { href: "/analyze", label: "Analyze document", hint: "Key points and structure", icon: ScanSearch },
  { href: "/code", label: "Code assistant", hint: "Find and fix bugs", icon: Code2 },
  { href: "/visualize", label: "Visualize", hint: "Diagrams and concept maps", icon: Workflow },
  { href: "/planner", label: "Study planner", hint: "Plan around weak topics", icon: CalendarCheck },
];
