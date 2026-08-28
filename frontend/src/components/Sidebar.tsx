"use client";

import {
  Activity,
  Camera,
  FileText,
  LayoutDashboard,
  Menu,
  Settings,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navigation: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/students",
    label: "Students",
    icon: Users,
  },
  {
    href: "/register",
    label: "Register Student",
    icon: UserPlus,
  },
  {
    href: "/attendance",
    label: "Take Attendance",
    icon: Camera,
  },
  {
    href: "/attendance-history",
    label: "Attendance History",
    icon: FileText,
  },
];

const systemNavigation: NavItem[] = [
  {
    href: "/system-status",
    label: "System Status",
    icon: Activity,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;

    const active =
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href ||
          pathname.startsWith(`${item.href}/`);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={`smart-nav-item group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${
          active
            ? "smart-nav-active bg-slate-950 text-white"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
        }`}
      >
        <Icon
          size={18}
          className="relative z-10 transition-transform duration-200 group-hover:scale-110"
        />

        <span className="relative z-10">
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-[70] flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 lg:hidden"
        aria-label="Toggle navigation"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[50] bg-slate-950/35 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-[60] flex h-screen w-[270px] flex-col border-r border-slate-200 bg-white shadow-[8px_0_30px_rgba(15,23,42,0.025)] transition-transform duration-300 ease-out ${
          open
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="border-b border-slate-100 px-6 py-6">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="group flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:rotate-1 group-hover:shadow-lg">
              <UserCheck size={23} />
            </div>

            <div>
              <h1 className="text-lg font-extrabold tracking-tight transition-colors group-hover:text-slate-700">
                SmartAttend
              </h1>

              <p className="text-xs text-slate-400">
                Face Recognition System
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>

          <div className="space-y-1">
            {navigation.map(renderItem)}
          </div>

          <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            System
          </p>

          <div className="space-y-1">
            {systemNavigation.map(renderItem)}
          </div>
        </nav>

        {/* Bottom card */}
        <div className="mx-4 mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-center gap-2">
            <span className="smart-status-dot h-2.5 w-2.5 rounded-full bg-emerald-500" />

            <span className="text-sm font-bold">
              SmartAttend
            </span>
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Attendance management portal
          </p>
        </div>
      </aside>
    </>
  );
}