import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex flex-col px-6 py-8 md:px-14">
        <Link href="/" className="text-lg font-bold tracking-tight">
          EduFusion <span className="text-accent">AI</span>
        </Link>
        <div className="flex flex-1 items-center">{children}</div>
      </div>
      <aside className="hidden flex-col justify-end bg-navy p-14 text-white md:flex">
        <p className="max-w-sm text-xl font-medium leading-snug">
          EduFusion turns every lecture and reading into a study experience built just for me.
        </p>
        <p className="mt-3 text-sm text-white/60">Maya R., Computer Science</p>
      </aside>
    </div>
  );
}
