"use client";

import {
  ArrowLeft,
  Bell,
  Camera,
  Check,
  Clock3,
  Monitor,
  RotateCcw,
  Save,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const defaults = {
  autoRefresh: true,
  refreshInterval: "30",
  recognitionInterval: "3",
  notifications: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("smartattend-settings");
      if (stored) {
        setSettings({
          ...defaults,
          ...JSON.parse(stored),
        });
      }
    } catch (error) {
      console.error("Unable to load settings:", error);
    }
  }, []);

  function update<K extends keyof typeof defaults>(
    key: K,
    value: (typeof defaults)[K]
  ) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
    setSaved(false);
  }

  function saveSettings() {
    localStorage.setItem(
      "smartattend-settings",
      JSON.stringify(settings)
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  function resetSettings() {
    setSettings(defaults);
    localStorage.setItem(
      "smartattend-settings",
      JSON.stringify(defaults)
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc]">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex min-h-[92px] items-center justify-between gap-4 px-5 py-5 md:px-8 lg:px-10">
          <div className="ml-14 lg:ml-0">
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
              <Link href="/" className="inline-flex items-center gap-1 hover:text-slate-700">
                <ArrowLeft size={14} />
                Dashboard
              </Link>
              <span>/</span>
              <span>Settings</span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight">
              Settings
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Configure local SmartAttend dashboard preferences.
            </p>
          </div>

          <button
            onClick={saveSettings}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? "Saved" : "Save Settings"}
          </button>
        </div>
      </header>

      <div className="p-5 md:p-8 lg:p-10">
        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Settings2 size={21} />
              </div>
              <div>
                <h2 className="font-bold">Application Preferences</h2>
                <p className="text-xs text-slate-400">
                  These settings are stored locally in this browser.
                </p>
              </div>
            </div>

            <div className="mt-7 divide-y divide-slate-100">
              <SettingRow
                icon={<Monitor size={19} />}
                title="Dashboard Auto Refresh"
                description="Automatically refresh live dashboard data."
              >
                <Toggle
                  checked={settings.autoRefresh}
                  onChange={(value) => update("autoRefresh", value)}
                />
              </SettingRow>

              <SettingRow
                icon={<Clock3 size={19} />}
                title="Dashboard Refresh Interval"
                description="How frequently the dashboard refreshes."
              >
                <select
                  value={settings.refreshInterval}
                  onChange={(event) =>
                    update("refreshInterval", event.target.value)
                  }
                  disabled={!settings.autoRefresh}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none disabled:opacity-40"
                >
                  <option value="15">15 seconds</option>
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="120">2 minutes</option>
                </select>
              </SettingRow>

              <SettingRow
                icon={<Camera size={19} />}
                title="Recognition Interval"
                description="Face recognition polling interval on Take Attendance."
              >
                <select
                  value={settings.recognitionInterval}
                  onChange={(event) =>
                    update("recognitionInterval", event.target.value)
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none"
                >
                  <option value="2">2 seconds</option>
                  <option value="3">3 seconds</option>
                  <option value="5">5 seconds</option>
                  <option value="10">10 seconds</option>
                </select>
              </SettingRow>

              <SettingRow
                icon={<Bell size={19} />}
                title="Browser Notifications"
                description="Allow SmartAttend to show browser notifications."
              >
                <Toggle
                  checked={settings.notifications}
                  onChange={(value) => update("notifications", value)}
                />
              </SettingRow>
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
              <RotateCcw size={20} />
            </div>

            <h2 className="mt-5 font-bold">Reset Preferences</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Restore the default SmartAttend dashboard preferences.
            </p>

            <button
              onClick={resetSettings}
              className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Reset to Defaults
            </button>

            <div className="mt-7 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Current setup
              </p>
              <p className="mt-2 text-sm font-semibold">
                No account required
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                SmartAttend operates directly with your local Flask backend
                and MongoDB setup.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-slate-500">{icon}</div>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">
            {description}
          </p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`relative h-7 w-12 rounded-full transition ${
        checked ? "bg-slate-950" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}
