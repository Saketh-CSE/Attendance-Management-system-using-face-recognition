"use client";

import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, checkHealth, getModelStatus } from "@/lib/api";

type Service = {
  name: string;
  description: string;
  icon: React.ReactNode;
  online: boolean;
  detail: string;
};

export default function SystemStatusPage() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [lastChecked, setLastChecked] = useState("");

  async function checkSystem() {
    setLoading(true);

    let backend = false;
    let models = false;
    let database = false;

    try {
      const health = await checkHealth();
      backend =
        health?.status === "healthy" ||
        health?.models_healthy === true;
      models =
        health?.models_ready === true ||
        health?.models_healthy === true;
    } catch (error) {
      console.error("Health check failed:", error);
    }

    try {
      const modelData = await getModelStatus();
      models =
        models ||
        modelData?.ready === true ||
        modelData?.models_ready === true ||
        modelData?.status === "ready";
    } catch (error) {
      console.warn("Model status unavailable:", error);
    }

    try {
      await api.get("/api/students/count");
      database = true;
    } catch (error) {
      console.error("Database check failed:", error);
    }

    setServices([
      {
        name: "Flask Backend",
        description: "REST API and application server",
        icon: <Server size={21} />,
        online: backend,
        detail: backend ? "API responding normally" : "API unavailable",
      },
      {
        name: "MongoDB",
        description: "Student and attendance database",
        icon: <Database size={21} />,
        online: database,
        detail: database ? "Database responding normally" : "Database unavailable",
      },
      {
        name: "Face Recognition",
        description: "DeepFace recognition models",
        icon: <ShieldCheck size={21} />,
        online: models,
        detail: models ? "Recognition models ready" : "Recognition models unavailable",
      },
      {
        name: "Attendance Service",
        description: "Attendance session API",
        icon: <Activity size={21} />,
        online: backend && models,
        detail:
          backend && models
            ? "Ready to take attendance"
            : "Service needs attention",
      },
    ]);

    setLastChecked(
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
    setLoading(false);
  }

  useEffect(() => {
    checkSystem();
  }, []);

  const allHealthy =
    services.length > 0 && services.every((service) => service.online);

  return (
    <main className="min-h-screen bg-[#f6f8fc]">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex min-h-[92px] items-center justify-between gap-4 px-5 py-5 md:px-8 lg:px-10">
          <div className="ml-14 lg:ml-0">
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
              <Link href="/" className="hover:text-slate-700">
                <span className="inline-flex items-center gap-1">
                  <ArrowLeft size={14} />
                  Dashboard
                </span>
              </Link>
              <span>/</span>
              <span>System Status</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              System Status
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Monitor the services required by SmartAttend.
            </p>
          </div>

          <button
            onClick={checkSystem}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Check Now
          </button>
        </div>
      </header>

      <div className="p-5 md:p-8 lg:p-10">
        <section
          className={`mb-6 rounded-3xl border p-6 ${
            allHealthy
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                allHealthy
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {allHealthy ? (
                <CheckCircle2 size={24} />
              ) : (
                <Activity size={24} />
              )}
            </div>

            <div>
              <h2 className="text-lg font-extrabold">
                {loading
                  ? "Checking system..."
                  : allHealthy
                    ? "All systems operational"
                    : "Some services need attention"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Last checked: {lastChecked || "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {services.map((service) => (
            <div
              key={service.name}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    {service.icon}
                  </div>
                  <div>
                    <h3 className="font-bold">{service.name}</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {service.description}
                    </p>
                  </div>
                </div>

                {service.online ? (
                  <CheckCircle2 className="text-emerald-500" size={22} />
                ) : (
                  <XCircle className="text-red-500" size={22} />
                )}
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <span className="text-sm text-slate-500">
                  {service.detail}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                    service.online
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {service.online ? "Operational" : "Offline"}
                </span>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
