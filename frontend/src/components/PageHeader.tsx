"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PageHeader({
  title,
  description,
  backHref = "/",
  backLabel = "Dashboard",
  action,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex min-h-[92px] items-center justify-between gap-4 px-5 py-5 md:px-8 lg:px-10">
        <div className="ml-14 lg:ml-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 transition hover:text-slate-700"
            >
              <ArrowLeft size={14} />
              {backLabel}
            </Link>
            <ChevronRight size={13} />
            <span>{title}</span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight">
            {title}
          </h1>

          {description && (
            <p className="mt-1 text-sm text-slate-400">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {action}
        </div>
      </div>
    </header>
  );
}
