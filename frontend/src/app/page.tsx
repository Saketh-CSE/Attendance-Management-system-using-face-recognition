"use client";

import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  api,
  checkHealth,
  getModelStatus,
  getStudentCount,
} from "@/lib/api";

type AttendanceRow = {
  id?: string;
  session_id?: string;
  studentId?: string;
  studentName?: string;
  student_id?: string;
  student_name?: string;
  subject?: string;
  date?: string;
  department?: string;
  year?: string;
  division?: string;
  status?: string;
  present?: boolean;
  markedAt?: string | null;
  marked_at?: string | null;
};

type DashboardStats = {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  sessionsToday: number;
};

export default function Home() {
  const [studentCount, setStudentCount] = useState(0);
  const [backendOnline, setBackendOnline] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRow[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    sessionsToday: 0,
  });

  const today = new Date().toLocaleDateString("en-CA");

  async function loadAttendance(currentStudentCount = studentCount) {
    setAttendanceLoading(true);

    try {
      const response = await api.get(
        `/api/attendance?date=${encodeURIComponent(today)}`
      );

      const data = response.data ?? {};
      const rows: AttendanceRow[] = Array.isArray(data.attendance)
        ? data.attendance
        : [];

      setRecentAttendance(rows.slice(0, 10));

      const presentIds = new Set(
        rows
          .filter(
            (row) =>
              row.present === true || row.status === "present"
          )
          .map((row) =>
            String(row.studentId ?? row.student_id ?? "")
          )
          .filter(Boolean)
      );

      const sessions = new Set(
        rows.map((row) => row.session_id).filter(Boolean)
      );

      const present = presentIds.size;
      const total = currentStudentCount;
      const absent = Math.max(total - present, 0);

      setStats({
        totalStudents: total,
        presentToday: present,
        absentToday: absent,
        attendanceRate:
          total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0,
        sessionsToday: sessions.size,
      });
    } catch (err) {
      console.error("Attendance API error:", err);
      setRecentAttendance([]);
      setStats((previous) => ({
        ...previous,
        totalStudents: currentStudentCount,
      }));
    } finally {
      setAttendanceLoading(false);
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const health = await checkHealth();

      setBackendOnline(
        health?.status === "healthy" ||
          health?.models_healthy === true
      );

      setModelsReady(
        health?.models_ready === true ||
          health?.models_healthy === true
      );

      let count = 0;

      try {
        const students = await getStudentCount();
        count =
          typeof students === "number"
            ? students
            : Number(students?.count ?? students?.total ?? 0);

        if (!Number.isFinite(count)) count = 0;
        setStudentCount(count);
      } catch (err) {
        console.error("Student count error:", err);
      }

      try {
        const models = await getModelStatus();
        if (
          models?.ready === true ||
          models?.models_ready === true ||
          models?.status === "ready" ||
          models?.health_check === true
        ) {
          setModelsReady(true);
        }
      } catch (err) {
        console.warn("Model status unavailable:", err);
      }

      await loadAttendance(count);
    } catch (err) {
      console.error("Dashboard API error:", err);
      setBackendOnline(false);
      setModelsReady(false);
      setError("Unable to connect to the Flask backend.");
      setAttendanceLoading(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredAttendance = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return recentAttendance;

    return recentAttendance.filter((row) =>
      [
        row.studentName,
        row.student_name,
        row.studentId,
        row.student_id,
        row.subject,
        row.department,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [recentAttendance, search]);

  return (
    <div className="smart-page-enter min-h-screen overflow-x-hidden bg-[#f4f7fb] text-slate-900">
      {/* Main */}
      <main className="min-h-screen w-full">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-[78px] items-center justify-between border-b border-slate-200/80 bg-white/80 px-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl md:px-8 lg:px-10">
          <div className="ml-14 lg:ml-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">
              Attendance Management
            </p>
            <h2 className="text-lg font-bold">Dashboard</h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden md:block">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search attendance..."
                className="smart-input w-56 rounded-2xl border border-slate-200/80 bg-slate-50/80 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((previous) => !previous)}
                className={`smart-button relative rounded-xl border bg-white p-2.5 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${
                  notificationsOpen
                    ? "border-slate-300 text-slate-950 ring-4 ring-slate-950/5"
                    : "border-slate-200 text-slate-600"
                }`}
                title="Notifications"
                aria-label="Open notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell size={18} />
                {(stats.absentToday > 0 || error) && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-600" />
                )}
              </button>

              {notificationsOpen && (
                <div className="smart-scale-in absolute right-0 top-14 z-50 w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        Notifications
                      </p>
                      <p className="text-[11px] text-slate-400">
                        SmartAttend activity
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>

                  <div className="max-h-[330px] overflow-y-auto p-2">
                    {error ? (
                      <div className="m-2 rounded-xl border border-red-100 bg-red-50 p-3">
                        <div className="flex gap-3">
                          <AlertCircle
                            size={17}
                            className="mt-0.5 shrink-0 text-red-500"
                          />
                          <div>
                            <p className="text-xs font-bold text-red-700">
                              Backend connection issue
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-red-600">
                              SmartAttend could not connect to the Flask backend.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <NotificationItem
                          icon={<CheckCircle2 size={17} />}
                          title="System is ready"
                          description={
                            backendOnline && modelsReady
                              ? "Backend and face-recognition services are operational."
                              : "Some services are still starting."
                          }
                          positive={backendOnline && modelsReady}
                        />

                        {stats.presentToday > 0 && (
                          <NotificationItem
                            icon={<Users size={17} />}
                            title={`${stats.presentToday} student${
                              stats.presentToday === 1 ? "" : "s"
                            } present today`}
                            description="Attendance records have been detected."
                            positive
                          />
                        )}

                        {stats.absentToday > 0 && (
                          <NotificationItem
                            icon={<AlertCircle size={17} />}
                            title={`${stats.absentToday} absent today`}
                            description="Review Attendance History for the latest records."
                          />
                        )}

                        {stats.sessionsToday > 0 && (
                          <NotificationItem
                            icon={<Clock3 size={17} />}
                            title={`${stats.sessionsToday} session${
                              stats.sessionsToday === 1 ? "" : "s"
                            } today`}
                            description="Finalized attendance sessions detected."
                            positive
                          />
                        )}

                        {!backendOnline && !modelsReady && !error && (
                          <NotificationItem
                            icon={<RefreshCw size={17} />}
                            title="Checking services"
                            description="The dashboard is waiting for service status."
                          />
                        )}
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                    <a
                      href="/system-status"
                      onClick={() => setNotificationsOpen(false)}
                      className="block text-center text-xs font-bold text-slate-600 transition hover:text-slate-950"
                    >
                      View system status →
                    </a>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={loadDashboard}
              disabled={loading || attendanceLoading}
              className="smart-button rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                size={18}
                className={
                  loading || attendanceLoading ? "animate-spin" : ""
                }
              />
            </button>

            <div className="hidden border-l border-slate-200 pl-4 text-right sm:block">
              <p className="text-sm font-bold">Administrator</p>
              <p className="text-[11px] text-slate-400">
                Attendance Portal
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
              A
            </div>
          </div>
        </header>

        <div className="relative p-5 md:p-7 lg:p-8">
          {/* Hero */}
          <section className="smart-hero relative mb-7 overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-[0_24px_70px_rgba(2,6,23,0.18)] md:p-10">
            <div className="relative z-10 max-w-2xl">
              <div className="smart-glass mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-lg">
                <ShieldCheck size={14} />
                Smart attendance control center
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                Welcome to SmartAttend
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 md:text-base">
                Manage students, capture attendance, monitor recognition
                services, and review your attendance activity from one place.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="/attendance"
                  className="smart-button group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg hover:-translate-y-1 hover:shadow-2xl hover:bg-slate-100"
                >
                  <Camera size={17} />
                  Take Attendance
                  <ArrowUpRight size={15} />
                </a>

                <a
                  href="/register"
                  className="smart-button smart-glass group inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-1 hover:bg-white/15 hover:shadow-xl"
                >
                  <UserPlus size={17} />
                  Register Student
                </a>
              </div>
            </div>

            <div className="smart-orb pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full border border-white/10 bg-blue-500/10 blur-[1px]" />
            <div className="smart-orb smart-orb-delay pointer-events-none absolute -bottom-40 right-12 h-72 w-72 rounded-full border border-white/10 bg-indigo-500/10" />
            <div className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl" />
          </section>

          {error && (
            <div className="smart-scale-in mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* KPI cards */}
          <section className="smart-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total Students"
              value={loading ? "..." : String(stats.totalStudents)}
              subtitle="Registered students"
              icon={<Users size={20} />}
              trend="Live"
            />

            <KpiCard
              title="Present Today"
              value={attendanceLoading ? "..." : String(stats.presentToday)}
              subtitle={`${stats.absentToday} absent today`}
              icon={<UserCheck size={20} />}
              trend={stats.presentToday > 0 ? "Active" : "—"}
            />

            <KpiCard
              title="Attendance Rate"
              value={
                attendanceLoading ? "..." : `${stats.attendanceRate}%`
              }
              subtitle="Today's attendance"
              icon={<TrendingUp size={20} />}
              trend={stats.attendanceRate >= 75 ? "Healthy" : "Low"}
            />

            <KpiCard
              title="Sessions Today"
              value={attendanceLoading ? "..." : String(stats.sessionsToday)}
              subtitle="Detected from attendance data"
              icon={<Clock3 size={20} />}
              trend="Today"
            />
          </section>

          {/* Analytics + status */}
          <section className="smart-stagger mt-6 grid gap-6 xl:grid-cols-3">
            <div className="smart-card relative overflow-hidden p-6 xl:col-span-2">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Daily overview
                  </p>
                  <h3 className="mt-1 text-xl font-bold">
                    Attendance performance
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Today's registered students and attendance progress.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  <BarChart3 size={15} />
                  {today}
                </div>
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-[1fr_220px] md:items-center">
                <div>
                  <div className="mb-3 flex items-end justify-between">
                    <div>
                      <p className="text-4xl font-extrabold tracking-tight">
                        {attendanceLoading
                          ? "..."
                          : `${stats.attendanceRate}%`}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Overall attendance rate today
                      </p>
                    </div>
                    <Activity className="mb-2 text-slate-300" size={25} />
                  </div>

                  <div className="relative h-4 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                    <div
                      className="smart-progress h-full rounded-full bg-slate-950 shadow-[0_0_18px_rgba(15,23,42,0.22)] transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.min(
                          Math.max(stats.attendanceRate, 0),
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniMetric
                      label="Present"
                      value={stats.presentToday}
                    />
                    <MiniMetric
                      label="Absent"
                      value={stats.absentToday}
                    />
                  </div>
                </div>

                <div className="smart-ring mx-auto flex h-44 w-44 items-center justify-center rounded-full border-[18px] border-slate-100 bg-white shadow-[inset_0_0_35px_rgba(15,23,42,0.06),0_15px_40px_rgba(15,23,42,0.08)] md:h-48 md:w-48">
                  <div className="text-center">
                    <p className="text-3xl font-extrabold">
                      {stats.presentToday}
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">
                      of {stats.totalStudents} present
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="smart-card relative overflow-hidden p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Health
                  </p>
                  <h3 className="mt-1 text-xl font-bold">
                    System status
                  </h3>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <ShieldCheck size={20} className="text-slate-700" />
                </div>
              </div>

              <div className="mt-7 space-y-4">
                <HealthRow
                  title="Flask Backend"
                  description="API connection"
                  online={backendOnline}
                />
                <HealthRow
                  title="Face Recognition"
                  description="DeepFace models"
                  online={modelsReady}
                />
                <HealthRow
                  title="Database"
                  description="MongoDB connection"
                  online={backendOnline}
                />
                <HealthRow
                  title="Attendance Service"
                  description="Recognition endpoint"
                  online={backendOnline && modelsReady}
                />
              </div>

              <div className="mt-7 rounded-2xl bg-slate-950 p-4 text-white">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-bold">
                    {backendOnline && modelsReady
                      ? "Ready for attendance"
                      : "Service needs attention"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {backendOnline && modelsReady
                    ? "You can start a face-recognition session."
                    : "Check the Flask server and recognition model status."}
                </p>
              </div>
            </div>
          </section>

          {/* Quick actions */}
          <section className="smart-card mt-6 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Shortcuts
              </p>
              <h3 className="mt-1 text-xl font-bold">Quick actions</h3>
              <p className="mt-1 text-sm text-slate-400">
                Jump directly into the most common operations.
              </p>
            </div>

            <div className="smart-stagger mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ActionCard
                href="/attendance"
                title="Take Attendance"
                description="Start live face recognition"
                icon={<Camera size={22} />}
                primary
              />
              <ActionCard
                href="/register"
                title="Register Student"
                description="Capture five face images"
                icon={<UserPlus size={22} />}
              />
              <ActionCard
                href="/students"
                title="Manage Students"
                description="View registered students"
                icon={<Users size={22} />}
              />
              <ActionCard
                href="/attendance-history"
                title="View Reports"
                description="Filter and export attendance"
                icon={<FileText size={22} />}
              />
            </div>
          </section>

          {/* Recent attendance */}
          <section className="smart-card mt-6 overflow-hidden">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Activity
                </p>
                <h3 className="mt-1 text-xl font-bold">
                  Recent attendance
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Latest records from today's finalized attendance sessions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative md:hidden">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search"
                    className="w-36 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-2 text-sm outline-none"
                  />
                </div>

                <a
                  href="/attendance-history"
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View all
                  <ChevronRight size={15} />
                </a>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {attendanceLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <RefreshCw
                          size={20}
                          className="mx-auto animate-spin text-slate-400"
                        />
                        <p className="mt-3 text-sm text-slate-400">
                          Loading attendance...
                        </p>
                      </td>
                    </tr>
                  ) : filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                            <FileText size={22} className="text-slate-400" />
                          </div>
                          <p className="mt-4 text-sm font-bold">
                            {search
                              ? "No matching records"
                              : "No attendance today"}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            {search
                              ? "Try another student, ID, or subject."
                              : "Finalized attendance records will appear here."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((row, index) => (
                      <AttendanceRowView
                        key={
                          row.id ??
                          `${row.session_id}-${row.studentId}-${index}`
                        }
                        row={row}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row">
            <p>SmartAttend · Face Recognition Attendance System</p>
            <p>Flask API · DeepFace · MongoDB</p>
          </footer>
        </div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  active = false,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`smart-nav-item group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${
        active
          ? "smart-nav-active bg-slate-950 text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <span
        className={`transition ${
          active ? "text-white" : "text-slate-400 group-hover:text-slate-700"
        }`}
      >
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
}

function NotificationItem({
  icon,
  title,
  description,
  positive = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  positive?: boolean;
}) {
  return (
    <div className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          positive
            ? "bg-emerald-50 text-emerald-600"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-800">{title}</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend: string;
}) {
  return (
    <div className="smart-card group relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
          {icon}
        </div>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {trend}
        </span>
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight transition-transform duration-300 group-hover:translate-x-1">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function HealthRow({
  title,
  description,
  online,
}: {
  title: string;
  description: string;
  online: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            online ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-700">
            {title}
          </p>
          <p className="truncate text-xs text-slate-400">{description}</p>
        </div>
      </div>

      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
          online
            ? "bg-emerald-50 text-emerald-700"
            : "bg-red-50 text-red-700"
        }`}
      >
        {online ? "Ready" : "Offline"}
      </span>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
  primary = false,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className={`smart-action group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${
        primary
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
          primary
            ? "bg-white text-slate-950"
            : "bg-slate-100 text-slate-700"
        }`}
      >
        {icon}
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold">{title}</h4>
        <ArrowUpRight
          size={16}
          className={`transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${
            primary ? "text-slate-300" : "text-slate-300"
          }`}
        />
      </div>

      <p
        className={`mt-1 text-xs leading-5 ${
          primary ? "text-slate-400" : "text-slate-400"
        }`}
      >
        {description}
      </p>
    </a>
  );
}

function AttendanceRowView({
  row,
}: {
  row: AttendanceRow;
}) {
  const name = row.studentName ?? row.student_name ?? "Unknown";
  const studentId = row.studentId ?? row.student_id ?? "—";
  const subject = row.subject ?? "—";
  const department = row.department ?? "—";
  const markedAt = row.markedAt ?? row.marked_at;

  const isPresent =
    row.present === true || row.status === "present";

  let time = "—";

  if (markedAt) {
    const parsed = new Date(markedAt);
    if (!Number.isNaN(parsed.getTime())) {
      time = parsed.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  return (
    <tr className="smart-table-row border-b border-slate-50 last:border-0">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-extrabold text-slate-700">
            {name.trim().slice(0, 1).toUpperCase()}
          </div>
          <span className="text-sm font-bold text-slate-800">
            {name}
          </span>
        </div>
      </td>

      <td className="px-6 py-4 text-sm font-medium text-slate-500">
        {studentId}
      </td>

      <td className="px-6 py-4 text-sm text-slate-600">{subject}</td>

      <td className="px-6 py-4 text-sm text-slate-500">
        {department}
      </td>

      <td className="px-6 py-4 text-sm text-slate-500">{time}</td>

      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
            isPresent
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isPresent ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          {isPresent ? "Present" : "Absent"}
        </span>
      </td>
    </tr>
  );
}
