"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  CircleStop,
  Play,
  Users,
  Clock,
  AlertCircle,
} from "lucide-react";

type RecognizedStudent = {
  id: string;
  name: string;
  confidence: number;
  status: string;
  division?: string;
  time: string;
};

export default function AttendancePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const runningRef = useRef(false);
  const finalizingRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [running, setRunning] = useState(false);

  const [subject, setSubject] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");

  const [sessionId, setSessionId] = useState("");
  const [studentsCount, setStudentsCount] = useState(0);
  const [presentCount, setPresentCount] = useState(0);

  const [students, setStudents] = useState<RecognizedStudent[]>([]);

  const [processing, setProcessing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =========================
  // CLEANUP
  // =========================

  useEffect(() => {
    return () => {
      runningRef.current = false;
      finalizingRef.current = false;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;
      }
    };
  }, []);

  // =========================
  // CAMERA
  // =========================

  async function startCamera() {
    setError("");
    setMessage("");

    try {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
      setMessage("Camera started.");
    } catch (err) {
      console.error("Camera error:", err);

      setError(
        "Unable to access webcam. Please allow camera permission."
      );
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
  }

  // =========================
  // CREATE ATTENDANCE SESSION
  // =========================

  async function createSession() {
    setError("");
    setMessage("");

    const cleanSubject = subject.trim();
    const cleanDepartment = department.trim();
    const cleanYear = year.trim();

    if (!cleanSubject) {
      setError("Please enter the subject.");
      return;
    }

    if (!cleanDepartment) {
      setError("Please enter the department.");
      return;
    }

    if (!cleanYear) {
      setError("Please enter the year.");
      return;
    }

    if (sessionId) {
      setError(
        "An attendance session is already active. Finalize it before creating another session."
      );
      return;
    }

    console.log(
      "Creating attendance session:",
      {
        subject: cleanSubject,
        department: cleanDepartment,
        year: cleanYear,
      }
    );

    try {
      const response = await api.post(
        "/api/attendance/create_session",
        {
          date: new Date()
            .toISOString()
            .split("T")[0],
          subject: cleanSubject,
          department: cleanDepartment,
          year: cleanYear,
        }
      );

      console.log(
        "Create session response:",
        response.data
      );

      const data = response.data;
      const id = data.session_id;

      if (!id) {
        throw new Error(
          "Backend did not return a session ID."
        );
      }

      const count = Number(
        data.students_count ?? 0
      );

      setSessionId(String(id));
      setStudentsCount(count);
      setPresentCount(0);
      setStudents([]);

      if (count > 0) {
        setMessage(
          `Attendance session created. ${count} student${
            count === 1 ? "" : "s"
          } loaded.`
        );
      } else {
        setError(
          "Session was created, but 0 students were loaded. Check the Department and Year against the registered students."
        );
      }
    } catch (err: any) {
      console.error(
        "Create session error:",
        err
      );

      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Unable to create attendance session."
      );
    }
  }

  // =========================
  // CAPTURE FRAME
  // =========================

  function captureFrame(): string | null {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      console.warn(
        "Capture skipped: video/canvas not available."
      );
      return null;
    }

    if (
      video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    ) {
      console.warn(
        "Capture skipped: camera frame is not ready.",
        {
          readyState: video.readyState,
          width: video.videoWidth,
          height: video.videoHeight,
        }
      );

      return null;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext("2d");

    if (!context) {
      console.error(
        "Capture failed: canvas context unavailable."
      );

      return null;
    }

    context.drawImage(
      video,
      0,
      0,
      width,
      height
    );

    return canvas.toDataURL(
      "image/jpeg",
      0.80
    );
  }

  // =========================
  // FACE RECOGNITION
  // =========================

  async function recognizeFrame() {
    console.log("ðŸ”Ž Recognition tick", {
      sessionId,
      running: runningRef.current,
      processing,
      cameraOn,
    });

    if (!sessionId) {
      console.warn(
        "Recognition skipped: no session ID."
      );
      return;
    }

    if (!runningRef.current) {
      return;
    }

    if (finalizingRef.current) {
      return;
    }

    if (processing) {
      console.log(
        "Recognition skipped: previous request is still processing."
      );
      return;
    }

    const image = captureFrame();

    if (!image) {
      return;
    }

    setProcessing(true);

    try {
      console.log(
        "ðŸ“¸ Sending camera frame to /real-mark..."
      );

      const response = await api.post(
        "/api/attendance/real-mark",
        {
          session_id: sessionId,
          image,
        }
      );

      const data = response.data;

      console.log(
        "âœ… Recognition response:",
        data
      );

      if (data.session_info) {
        setPresentCount(
          Number(
            data.session_info
              .total_present_now ?? 0
          )
        );
      }

      if (data.message) {
        console.log(
          "Recognition message:",
          data.message
        );
      }

      if (Array.isArray(data.faces)) {
        for (const face of data.faces) {
          if (!face.match) {
            console.log(
              "Face detected, but no registered student matched.",
              face
            );

            continue;
          }

          const id = String(
            face.match.studentId ??
              face.match.student_id ??
              face.match.user_id ??
              ""
          );

          const name =
            face.match.studentName ??
            face.match.student_name ??
            face.match.name ??
            "Unknown";

          const division =
            face.match.division ??
            "";

          const status =
            face.status ??
            "recognized";

          const confidence = Number(
            face.confidence ?? 0
          );

          console.log(
            "ðŸŽ¯ Student recognized:",
            {
              id,
              name,
              division,
              status,
              confidence,
            }
          );

          if (
            status ===
              "marked_present" ||
            status ===
              "marked_present_new"
          ) {
            setStudents(
              (previous) => {
                const exists =
                  previous.some(
                    (student) =>
                      student.id === id
                  );

                if (exists) {
                  return previous;
                }

                return [
                  {
                    id,
                    name,
                    confidence,
                    status,
                    division,
                    time: new Date().toLocaleTimeString(),
                  },
                  ...previous,
                ];
              }
            );

            setMessage(
              `${name} marked present successfully${
                division
                  ? ` â€” Division: ${division}`
                  : ""
              }`
            );
          } else if (
            status === "duplicate" ||
            status ===
              "already_present"
          ) {
            setMessage(
              `${name} is already marked present${
                division
                  ? ` â€” Division: ${division}`
                  : ""
              }.`
            );
          }
        }
      }
    } catch (err: any) {
      console.error(
        "âŒ Recognition error:",
        err
      );

      if (err?.response) {
        console.error(
          "Backend response:",
          err.response.status,
          err.response.data
        );

        if (
          err.response.status === 400
        ) {
          setError(
            err.response.data?.error ||
              "Attendance request was rejected."
          );
        }
      } else {
        console.error(
          "No backend response. Check whether Flask is running on port 5000."
        );
      }
    } finally {
      setProcessing(false);
    }
  }

  // =========================
  // START RECOGNITION
  // =========================

  function startRecognition() {
    setError("");

    console.log(
      "â–¶ï¸ Start recognition requested:",
      {
        sessionId,
        cameraOn,
        studentsCount,
        running,
      }
    );

    if (!cameraOn) {
      setError(
        "Start the camera first."
      );
      return;
    }

    if (!sessionId) {
      setError(
        "Create an attendance session first."
      );
      return;
    }

    if (studentsCount === 0) {
      setError(
        "No students are loaded in this session. Create the session again with the correct Department and Year."
      );
      return;
    }

    if (running) {
      console.log(
        "Recognition is already running."
      );
      return;
    }

    if (finalizing) {
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    runningRef.current = true;

    setRunning(true);
    setMessage(
      "Live attendance recognition started."
    );

    setTimeout(() => {
      if (
        runningRef.current &&
        !finalizingRef.current
      ) {
        console.log(
          "ðŸ“¸ Performing first recognition attempt..."
        );

        recognizeFrame();
      }
    }, 500);

    timerRef.current =
      setInterval(() => {
        if (
          runningRef.current &&
          !finalizingRef.current
        ) {
          recognizeFrame();
        }
      }, 3000);
  }

  // =========================
  // PAUSE RECOGNITION
  // =========================

  function pauseRecognition() {
    runningRef.current = false;
    setRunning(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setMessage(
      "Recognition paused."
    );
  }

  // =========================
  // END SESSION
  // =========================

  async function endSession() {
    if (!sessionId) {
      setError(
        "No active attendance session."
      );
      return;
    }

    // Prevent double-click / duplicate requests
    if (finalizingRef.current) {
      console.log(
        "Finalization already in progress."
      );
      return;
    }

    setError("");
    setMessage("");

    finalizingRef.current = true;
    setFinalizing(true);

    // Stop recognition immediately
    runningRef.current = false;
    setRunning(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const currentSessionId =
      sessionId;

    console.log(
      "ðŸ›‘ Finalizing session:",
      currentSessionId
    );

    try {
      const response = await api.post(
        "/api/attendance/end_session",
        {
          session_id:
            currentSessionId,
        }
      );

      console.log(
        "âœ… End session response:",
        response.data
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.error ||
            "Attendance session could not be finalized."
        );
      }

      const statistics =
        response.data
          ?.statistics ?? {};

      const present = Number(
        statistics.present_count ??
          presentCount
      );

      const absent = Number(
        statistics.absent_count ??
          Math.max(
            studentsCount -
              present,
            0
          )
      );

      const total = Number(
        statistics.total_students ??
          studentsCount
      );

      // Stop webcam
      stopCamera();

      // Update final statistics
      setPresentCount(present);
      setStudentsCount(total);

      // Show completion message
      setMessage(
        `Session completed â€” ${present} present, ${absent} absent.`
      );

      // Keep the final recognized-student list visible so the teacher can verify who was marked.
      // Clear only the active session after the backend confirms finalization.
      setMessage(
        `Session finalized successfully — ${present} present, ${absent} absent out of ${total}.`
      );

      setSessionId("");

      console.log(
        "ðŸŽ‰ Attendance session finalized successfully."
      );
    } catch (err: any) {
      console.error(
        "âŒ End session error:",
        err
      );

      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Unable to end attendance session."
      );
    } finally {
      finalizingRef.current =
        false;

      setFinalizing(false);
    }
  }

  // =========================
  // STOP EVERYTHING
  // =========================

  function stopAttendance() {
    runningRef.current = false;

    setRunning(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    stopCamera();
  }

  // =========================
  // UI
  // =========================

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <a
              href="/"
              className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
            >
              <ChevronLeft size={17} />
              Back to Dashboard
            </a>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Camera size={24} />
              </div>

              <div>
                <h1 className="text-3xl font-bold">
                  Take Attendance
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Live face recognition attendance
                </p>
              </div>
            </div>
          </div>

          <div
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              running
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {running
              ? "â— Recognition Active"
              : "â— Not Running"}
          </div>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            <CheckCircle2 size={19} />
            {message}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <AlertCircle size={19} />
            {error}
          </div>
        )}

        {/* SESSION SETUP */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">
            Class Session
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select the subject, department and year.
            Division is automatically associated with
            each registered student.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <Input
              label="Subject"
              value={subject}
              onChange={setSubject}
              placeholder="Data Mining"
            />

            <Input
              label="Department"
              value={department}
              onChange={setDepartment}
              placeholder="Testing"
            />

            <Input
              label="Year"
              value={year}
              onChange={setYear}
              placeholder="4"
            />

            <button
              onClick={createSession}
              disabled={
                running ||
                finalizing ||
                !!sessionId
              }
              className="self-end rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Create Session
            </button>
          </div>

          {sessionId && (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Session ID: {sessionId}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">

          {/* CAMERA */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold">
                  Live Camera
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Recognition runs every 3 seconds
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    cameraOn
                      ? "bg-emerald-500"
                      : "bg-slate-300"
                  }`}
                />

                <span className="text-xs text-slate-500">
                  {cameraOn
                    ? "Connected"
                    : "Disconnected"}
                </span>
              </div>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-2xl bg-slate-950">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="aspect-video w-full object-cover"
              />

              {!cameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <Camera
                    size={45}
                    className="mb-3 opacity-50"
                  />

                  <p className="text-sm text-slate-400">
                    Camera is not active
                  </p>
                </div>
              )}

              {running && (
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white">
                  <span className="h-2 w-2 rounded-full bg-white" />
                  LIVE
                </div>
              )}
            </div>

            <canvas
              ref={canvasRef}
              className="hidden"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              {!cameraOn ? (
                <button
                  onClick={startCamera}
                  disabled={finalizing}
                  className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Camera size={18} />
                  Start Camera
                </button>
              ) : (
                <>
                  {!running ? (
                    <button
                      onClick={startRecognition}
                      disabled={
                        !sessionId ||
                        studentsCount === 0 ||
                        finalizing
                      }
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Play size={18} />
                      Start Recognition
                    </button>
                  ) : (
                    <button
                      onClick={pauseRecognition}
                      disabled={finalizing}
                      className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 font-semibold text-amber-700 disabled:opacity-50"
                    >
                      Pause Recognition
                    </button>
                  )}

                  <button
                    onClick={stopAttendance}
                    disabled={finalizing}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 font-semibold hover:bg-slate-50 disabled:opacity-50"
                  >
                    <CircleStop size={18} />
                    Stop Camera
                  </button>
                </>
              )}
            </div>

            {/* END SESSION */}
            <button
              onClick={endSession}
              disabled={
                !sessionId ||
                running ||
                finalizing
              }
              className="mt-3 w-full rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {finalizing
                ? "Finalizing Attendance..."
                : "End & Finalize Attendance"}
            </button>
          </section>

          {/* STATISTICS */}
          <section className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={<Users size={20} />}
                label="Class Size"
                value={studentsCount}
              />

              <StatCard
                icon={<CheckCircle2 size={20} />}
                label="Present"
                value={presentCount}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold">
                    Recognized Students
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Students marked in this session
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-600">
                  {students.length}
                </div>
              </div>

              <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto">
                {students.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">
                    No students recognized yet.
                  </div>
                ) : (
                  students.map((student) => (
                    <div
                      key={student.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {student.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            ID: {student.id}
                          </p>

                          {student.division && (
                            <p className="mt-1 text-xs text-slate-500">
                              Division:{" "}
                              {student.division}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600">
                            {student.confidence.toFixed(
                              1
                            )}
                            %
                          </p>

                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                            <Clock size={12} />
                            {student.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

// =========================
// INPUT COMPONENT
// =========================

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <input
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

// =========================
// STAT CARD
// =========================

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}

        <span className="text-sm">
          {label}
        </span>
      </div>

      <p className="mt-3 text-3xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}
