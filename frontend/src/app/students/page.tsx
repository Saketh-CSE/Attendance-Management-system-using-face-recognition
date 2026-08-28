"use client";

import {
  Eye,
  Mail,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  deleteStudent,
  getDepartments,
  getStudents,
  searchStudents,
} from "@/lib/api";

type Student = {
  studentId?: string;
  student_id?: string;
  studentName?: string;
  name?: string;
  department?: string;
  Department?: string;
  year?: string;
  division?: string;
  semester?: string;
  email?: string;
  phoneNumber?: string;
  status?: string;
  face_registered?: boolean;
  faceRegistered?: boolean;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  async function loadStudents() {
    try {
      setLoading(true);
      setError("");

      const data = await getStudents();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.students)
          ? data.students
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setStudents(list);
    } catch (err) {
      console.error(err);
      setError("Unable to load students. Please check the backend.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartments() {
    try {
      const data = await getDepartments();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.departments)
          ? data.departments
          : [];

      setDepartments(list);
    } catch (err) {
      console.error("Department API error:", err);
    }
  }

  async function handleSearch() {
    if (!search.trim()) {
      await loadStudents();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await searchStudents(search.trim());

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.students)
          ? data.students
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setStudents(list);
    } catch (err) {
      console.error(err);
      setError("Search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(studentId: string) {
    if (!studentId) return;

    const confirmed = window.confirm(
      `Delete student ${studentId}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(studentId);
      await deleteStudent(studentId);
      setSelectedStudent(null);
      await loadStudents();
    } catch (err) {
      console.error(err);
      alert("Failed to delete student.");
    } finally {
      setDeletingId("");
    }
  }

  useEffect(() => {
    loadStudents();
    loadDepartments();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (!department) return true;

      return (
        student.department === department ||
        student.Department === department
      );
    });
  }, [students, department]);

  const registeredFaces = students.filter(
    (student) =>
      student.face_registered === true ||
      student.faceRegistered === true
  ).length;

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex min-h-[92px] items-center justify-between gap-4 px-5 py-5 md:px-8 lg:px-10">
          <div className="ml-14 lg:ml-0">
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
              <Link
                href="/"
                className="font-medium hover:text-slate-700"
              >
                ← Dashboard
              </Link>
              <span>/</span>
              <span>Students</span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight">
              Student Management
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              View, search, and manage students registered in SmartAttend.
            </p>
          </div>

          <Link
            href="/register"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <UserPlus size={17} />
            <span className="hidden sm:inline">Register Student</span>
            <span className="sm:hidden">Register</span>
          </Link>
        </div>
      </header>

      <main className="p-5 md:p-8 lg:p-10">
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              onClick={loadStudents}
              className="font-bold underline"
            >
              Retry
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Students"
            value={loading ? "..." : String(students.length)}
            description="Registered student profiles"
            icon={<Users size={21} />}
          />

          <StatCard
            title="Displayed"
            value={loading ? "..." : String(filteredStudents.length)}
            description={
              department
                ? `Filtered by ${department}`
                : "All departments"
            }
            icon={<Search size={21} />}
          />

          <StatCard
            title="Face Registered"
            value={loading ? "..." : String(registeredFaces)}
            description="Students ready for recognition"
            icon={<Eye size={21} />}
          />
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch();
                }}
                placeholder="Search by student ID or name..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <button
              onClick={handleSearch}
              disabled={loading}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Search
            </button>

            <button
              onClick={loadStudents}
              disabled={loading}
              title="Refresh students"
              className="flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold">Registered Students</h2>
              <p className="mt-1 text-xs text-slate-400">
                {filteredStudents.length} student
                {filteredStudents.length === 1 ? "" : "s"} displayed
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Academic</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Face</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <RefreshCw
                        size={24}
                        className="mx-auto animate-spin text-slate-400"
                      />
                      <p className="mt-3 text-sm text-slate-400">
                        Loading students...
                      </p>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="mx-auto max-w-sm">
                        <Users
                          size={34}
                          className="mx-auto text-slate-300"
                        />
                        <p className="mt-3 font-bold text-slate-700">
                          No students found
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          Try changing the search or department filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => {
                    const studentId = String(
                      student.studentId ??
                        student.student_id ??
                        "—"
                    );

                    const name =
                      student.studentName ??
                      student.name ??
                      "Unknown";

                    const dept =
                      student.department ??
                      student.Department ??
                      "—";

                    const year = student.year ?? "—";
                    const division = student.division ?? "—";
                    const semester = student.semester ?? "—";
                    const email = student.email ?? "—";

                    const faceRegistered =
                      student.face_registered === true ||
                      student.faceRegistered === true;

                    const deleting = deletingId === studentId;

                    return (
                      <tr
                        key={`${studentId}-${index}`}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-extrabold text-white">
                              {name
                                .trim()
                                .slice(0, 1)
                                .toUpperCase()}
                            </div>

                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {name}
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-slate-400">
                                {studentId}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-700">
                            {dept}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-slate-600">
                            Year {year}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Division {division} · Sem {semester}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex max-w-[230px] items-center gap-2 text-sm text-slate-600">
                            <Mail
                              size={15}
                              className="shrink-0 text-slate-400"
                            />
                            <span className="truncate">{email}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                              faceRegistered
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                faceRegistered
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                              }`}
                            />
                            {faceRegistered ? "Registered" : "Pending"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
                              title="View student"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              onClick={() => handleDelete(studentId)}
                              disabled={deleting}
                              className="rounded-xl border border-red-100 p-2.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                              title="Delete student"
                            >
                              {deleting ? (
                                <RefreshCw
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 flex justify-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <UserPlus size={17} />
            Register Another Student
          </Link>
        </div>
      </main>

      {selectedStudent && (
        <StudentModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onDelete={() =>
            handleDelete(
              String(
                selectedStudent.studentId ??
                  selectedStudent.student_id ??
                  ""
              )
            )
          }
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
        {icon}
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function StudentModal({
  student,
  onClose,
  onDelete,
}: {
  student: Student;
  onClose: () => void;
  onDelete: () => void;
}) {
  const name = student.studentName ?? student.name ?? "Unknown";
  const id = student.studentId ?? student.student_id ?? "—";
  const dept = student.department ?? student.Department ?? "—";
  const face =
    student.face_registered === true ||
    student.faceRegistered === true;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              {name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-extrabold">{name}</h3>
              <p className="font-mono text-xs text-slate-400">{id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Info label="Department" value={dept} />
          <Info label="Year" value={student.year ?? "—"} />
          <Info label="Division" value={student.division ?? "—"} />
          <Info label="Semester" value={student.semester ?? "—"} />
          <Info label="Email" value={student.email ?? "—"} />
          <Info label="Phone" value={student.phoneNumber ?? "—"} />
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
          <span className="text-sm font-semibold">Face registration</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              face
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {face ? "Registered" : "Pending"}
          </span>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Done
          </button>
          <button
            onClick={onDelete}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
          >
            Delete Student
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}
