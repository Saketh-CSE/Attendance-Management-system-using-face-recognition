"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Users,
  CalendarDays,
} from "lucide-react";
import { api } from "@/lib/api";

type AttendanceRecord = {
  id?: string;
  session_id?: string;

  studentId?: string;
  student_id?: string;

  studentName?: string;
  student_name?: string;

  department?: string;
  year?: string;
  division?: string;

  subject?: string;
  date?: string;

  status?: string;
  present?: boolean;

  markedAt?: string | null;
  marked_at?: string | null;

  created_at?: string | null;
  ended_at?: string | null;
};

type AttendanceResponse = {
  success: boolean;
  attendance?: AttendanceRecord[];
  stats?: {
    totalStudents?: number;
    presentToday?: number;
    absentToday?: number;
    attendanceRate?: number;
  };
  error?: string;
};

export default function AttendanceHistoryPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");

  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
  });

  async function loadAttendance() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (department.trim()) {
        params.set("department", department.trim());
      }

      if (year.trim()) {
        params.set("year", year.trim());
      }

      if (subject.trim()) {
        params.set("subject", subject.trim());
      }

      if (date) {
        params.set("date", date);
      }

      const url = params.toString()
        ? `/api/attendance?${params.toString()}`
        : "/api/attendance";

      const response =
        await api.get<AttendanceResponse>(url);

      const data = response.data;

      if (!data.success) {
        throw new Error(
          data.error || "Unable to load attendance."
        );
      }

      setRecords(
        Array.isArray(data.attendance)
          ? data.attendance
          : []
      );

      setStats({
        totalStudents:
          Number(
            data.stats?.totalStudents ?? 0
          ),

        presentToday:
          Number(
            data.stats?.presentToday ?? 0
          ),

        absentToday:
          Number(
            data.stats?.absentToday ?? 0
          ),

        attendanceRate:
          Number(
            data.stats?.attendanceRate ?? 0
          ),
      });
    } catch (err: any) {
      console.error(
        "Attendance history error:",
        err
      );

      setRecords([]);

      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Unable to load attendance."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, []);

  const filteredRecords = useMemo(() => {
    return records;
  }, [records]);

  function clearFilters() {
    setDepartment("");
    setYear("");
    setSubject("");
    setDate("");

    setTimeout(() => {
      loadAttendance();
    }, 0);
  }

  async function exportAttendance() {
    try {
      setError("");

      const params = new URLSearchParams();

      if (department.trim()) {
        params.set("department", department.trim());
      }

      if (year.trim()) {
        params.set("year", year.trim());
      }

      if (subject.trim()) {
        params.set("subject", subject.trim());
      }

      if (date) {
        params.set("date", date);
      }

      const url = params.toString()
        ? `/api/attendance/export?${params.toString()}`
        : "/api/attendance/export";

      const response = await api.get(url);

      const data = response.data;

      if (!data.success) {
        throw new Error(
          data.error ||
            "Unable to export attendance."
        );
      }

      const rows = Array.isArray(data.data)
        ? data.data
        : [];

      if (rows.length === 0) {
        alert(
          "No attendance records available to export."
        );
        return;
      }

      const headers = [
        "Student ID",
        "Name",
        "Subject",
        "Date",
        "Department",
        "Year",
        "Division",
        "Status",
      ];

      const csvRows = [
        headers,
        ...rows.map((row: any) => [
          row.studentId ?? "",
          row.name ?? "",
          row.subject ?? "",
          row.date ?? "",
          row.department ?? "",
          row.year ?? "",
          row.division ?? "",
          row.status ?? "",
        ]),
      ];

      const csv = csvRows
        .map((row) =>
          row
            .map((value: any) => {
              const text = String(value ?? "");
              return `"${text.replace(/"/g, '""')}"`;
            })
            .join(",")
        )
        .join("\n");

      const blob = new Blob(
        ["\ufeff" + csv],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

      const downloadUrl =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = downloadUrl;

      link.download =
        `attendance-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error(
        "Export error:",
        err
      );

      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Unable to export attendance."
      );
    }
  }

  function formatDate(value?: string) {
    if (!value) return "—";

    if (value.includes("T")) {
      return value.split("T")[0];
    }

    return value;
  }

  function formatTime(value?: string | null) {
    if (!value) return "—";

    try {
      return new Date(value).toLocaleTimeString();
    } catch {
      return value;
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft size={17} />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                <CalendarDays size={24} />
              </div>

              <div>
                <h1 className="text-3xl font-bold">
                  Attendance History
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  View finalized student attendance records.
                </p>
              </div>

            </div>
          </div>

          <button
            onClick={exportAttendance}
            disabled={loading || filteredRecords.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={17} />
            Export CSV
          </button>

        </div>

        {/* STATS */}
        <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <Users className="text-blue-600" size={21} />

              <div>
                <p className="text-xs text-slate-400">
                  Total Students
                </p>

                <p className="text-2xl font-bold">
                  {stats.totalStudents}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2
                className="text-emerald-600"
                size={21}
              />

              <div>
                <p className="text-xs text-slate-400">
                  Present
                </p>

                <p className="text-2xl font-bold">
                  {stats.presentToday}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <XCircle
                className="text-red-500"
                size={21}
              />

              <div>
                <p className="text-xs text-slate-400">
                  Absent
                </p>

                <p className="text-2xl font-bold">
                  {stats.absentToday}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-400">
              Attendance Rate
            </p>

            <p className="mt-1 text-2xl font-bold">
              {stats.attendanceRate}%
            </p>
          </div>

        </div>

        {/* FILTERS */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

            <input
              value={department}
              onChange={(e) =>
                setDepartment(e.target.value)
              }
              placeholder="Department"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />

            <input
              value={year}
              onChange={(e) =>
                setYear(e.target.value)
              }
              placeholder="Year"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />

            <input
              value={subject}
              onChange={(e) =>
                setSubject(e.target.value)
              }
              placeholder="Subject"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />

            <input
              type="date"
              value={date}
              onChange={(e) =>
                setDate(e.target.value)
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />

            <div className="flex gap-2">

              <button
                onClick={loadAttendance}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Search
              </button>

              <button
                onClick={clearFilters}
                className="flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50"
                title="Clear filters"
              >
                <RefreshCw size={17} />
              </button>

            </div>

          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">

                  <th className="px-5 py-4">
                    Student ID
                  </th>

                  <th className="px-5 py-4">
                    Name
                  </th>

                  <th className="px-5 py-4">
                    Subject
                  </th>

                  <th className="px-5 py-4">
                    Date
                  </th>

                  <th className="px-5 py-4">
                    Department
                  </th>

                  <th className="px-5 py-4">
                    Year
                  </th>

                  <th className="px-5 py-4">
                    Division
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4">
                    Marked At
                  </th>

                </tr>
              </thead>

              <tbody>

                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-16 text-center"
                    >
                      <RefreshCw
                        size={25}
                        className="mx-auto animate-spin text-blue-500"
                      />

                      <p className="mt-3 text-sm text-slate-400">
                        Loading attendance...
                      </p>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-16 text-center"
                    >
                      <CalendarDays
                        size={32}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 font-semibold">
                        No attendance records found
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        Finalized attendance sessions will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map(
                    (record, index) => {

                      const studentId =
                        record.studentId ??
                        record.student_id ??
                        "—";

                      const studentName =
                        record.studentName ??
                        record.student_name ??
                        "—";

                      const status =
                        record.present === true ||
                        String(
                          record.status
                        ).toLowerCase() ===
                          "present";

                      return (
                        <tr
                          key={
                            record.id ??
                            `${studentId}-${record.session_id}-${index}`
                          }
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold">
                              {studentId}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-medium">
                            {studentName}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {record.subject || "—"}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDate(record.date)}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {record.department || "—"}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {record.year || "—"}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {record.division || "—"}
                          </td>

                          <td className="px-5 py-4">

                            {status ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">
                                <CheckCircle2 size={14} />
                                Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                                <XCircle size={14} />
                                Absent
                              </span>
                            )}

                          </td>

                          <td className="px-5 py-4 text-sm text-slate-500">
                            {formatTime(
                              record.markedAt ??
                                record.marked_at
                            )}
                          </td>

                        </tr>
                      );
                    }
                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>
    </main>
  );
}