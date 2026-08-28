"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export default function RegisterStudent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    studentName: "",
    studentId: "",
    department: "",
    year: "",
    division: "",
    semester: "",
    email: "",
    phoneNumber: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // =========================
  // START CAMERA
  // =========================

  const startCamera = async () => {
    try {
      setMessage("Starting camera...");

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

      const video = videoRef.current;

      if (!video) {
        setMessage("Video element not found.");
        return;
      }

      video.srcObject = stream;

      video.onloadedmetadata = async () => {
        try {
          await video.play();
          setCameraOn(true);
          setMessage("Camera ready.");
        } catch (error) {
          console.error(error);
          setMessage("Unable to start video.");
        }
      };
    } catch (error) {
      console.error(error);
      setMessage(
        "Unable to access camera. Please allow camera permission."
      );
    }
  };

  // =========================
  // STOP CAMERA
  // =========================

  const stopCamera = () => {
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }

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
    setCapturing(false);
    setCountdown(0);
    setMessage("Camera stopped.");
  };

  // =========================
  // CAPTURE ONE IMAGE
  // =========================

  const captureOneImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return null;

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    ctx.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL("image/jpeg", 0.9);
  };

  // =========================
  // AUTOMATIC CAPTURE
  // =========================

  const startAutomaticCapture = () => {
    if (!cameraOn) {
      setMessage("Start the camera first.");
      return;
    }

    if (images.length > 0) {
      setImages([]);
    }

    setCapturing(true);
    setCountdown(3);
    setMessage(
      "Get ready. Automatic capture starting..."
    );

    let seconds = 3;

    const countdownTimer = setInterval(() => {
      seconds--;

      setCountdown(seconds);

      if (seconds <= 0) {
        clearInterval(countdownTimer);

        let captured = 0;

        const capture = () => {
          if (captured >= 5) {
            setCapturing(false);
            setCountdown(0);
            setMessage(
              "5 images captured successfully."
            );

            if (captureTimerRef.current) {
              clearInterval(captureTimerRef.current);
              captureTimerRef.current = null;
            }

            return;
          }

          const image = captureOneImage();

          if (image) {
            captured++;

            setImages((prev) => [
              ...prev,
              image,
            ]);

            setMessage(
              `Captured image ${captured} of 5`
            );
          }
        };

        capture();

        captureTimerRef.current = setInterval(
          capture,
          1500
        );
      }
    }, 1000);
  };

  // =========================
  // REMOVE IMAGE
  // =========================

  const removeImage = (index: number) => {
    if (capturing) return;

    setImages((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  // =========================
  // REGISTER STUDENT
  // =========================

  const registerStudent = async () => {
    for (const [key, value] of Object.entries(form)) {
      if (!value.trim()) {
        setMessage(`Please enter ${key}.`);
        return;
      }
    }

    if (images.length !== 5) {
      setMessage(
        `Exactly 5 images are required. Current: ${images.length}/5`
      );
      return;
    }

    try {
      setMessage(
        "Processing faces and registering student..."
      );

      const response = await api.post(
        "/api/register-student",
        {
          ...form,
          images,
        }
      );

      if (response.data.success) {
        setMessage(
          `Student registered successfully! ID: ${response.data.studentId}`
        );

        setImages([]);

        setForm({
          studentName: "",
          studentId: "",
          department: "",
          year: "",
          division: "",
          semester: "",
          email: "",
          phoneNumber: "",
        });
      } else {
        setMessage(
          response.data.error ||
            "Registration failed."
        );
      }
    } catch (error: any) {
      console.error(error);

      setMessage(
        error?.response?.data?.error ||
          "Registration request failed."
      );
    }
  };

  // =========================
  // CLEANUP
  // =========================

  useEffect(() => {
    return () => {
      if (captureTimerRef.current) {
        clearInterval(captureTimerRef.current);
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">

      <div className="max-w-6xl mx-auto">

        <h1 className="text-4xl font-bold">
          Register Student
        </h1>

        <p className="text-slate-400 mt-2 mb-8">
          Register student details and automatically
          capture 5 face images.
        </p>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* ================= DETAILS ================= */}

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-xl font-semibold mb-6">
              Student Information
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              <input
                className="input"
                placeholder="Student Name"
                value={form.studentName}
                onChange={(e) =>
                  updateField(
                    "studentName",
                    e.target.value
                  )
                }
              />

              <input
                className="input"
                placeholder="Student ID"
                value={form.studentId}
                onChange={(e) =>
                  updateField(
                    "studentId",
                    e.target.value
                  )
                }
              />

              <input
                className="input"
                placeholder="Department"
                value={form.department}
                onChange={(e) =>
                  updateField(
                    "department",
                    e.target.value
                  )
                }
              />

              <input
                className="input"
                placeholder="Year"
                value={form.year}
                onChange={(e) =>
                  updateField(
                    "year",
                    e.target.value
                  )
                }
              />

              <input
                className="input"
                placeholder="Division"
                value={form.division}
                onChange={(e) =>
                  updateField(
                    "division",
                    e.target.value
                  )
                }
              />

              <input
                className="input"
                placeholder="Semester"
                value={form.semester}
                onChange={(e) =>
                  updateField(
                    "semester",
                    e.target.value
                  )
                }
              />

              <input
                className="input md:col-span-2"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) =>
                  updateField(
                    "email",
                    e.target.value
                  )
                }
              />

              <input
                className="input md:col-span-2"
                placeholder="Phone Number"
                value={form.phoneNumber}
                onChange={(e) =>
                  updateField(
                    "phoneNumber",
                    e.target.value
                  )
                }
              />

            </div>

          </section>

          {/* ================= CAMERA ================= */}

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-xl font-semibold mb-6">
              Face Registration
            </h2>

            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  Camera is OFF
                </div>
              )}

              {capturing && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">

                  <div className="text-7xl font-bold">
                    {countdown}
                  </div>

                </div>
              )}

            </div>

            <canvas
              ref={canvasRef}
              className="hidden"
            />

            {/* CAMERA CONTROLS */}

            <div className="flex gap-3 mt-4 flex-wrap">

              {!cameraOn ? (
                <button
                  onClick={startCamera}
                  className="px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500"
                >
                  Start Camera
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="px-5 py-3 rounded-lg bg-red-600 hover:bg-red-500"
                >
                  Stop Camera
                </button>
              )}

              <button
                onClick={startAutomaticCapture}
                disabled={
                  !cameraOn ||
                  capturing
                }
                className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
              >
                {capturing
                  ? "Capturing..."
                  : "Auto Capture 5 Images"}
              </button>

            </div>

            {/* CAPTURE STATUS */}

            <div className="mt-5">

              <div className="flex justify-between mb-2">

                <span className="text-slate-400">
                  Face Images
                </span>

                <span className="font-semibold">
                  {images.length}/5
                </span>

              </div>

              <div className="w-full bg-slate-800 rounded-full h-3">

                <div
                  className="bg-emerald-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${(images.length / 5) * 100}%`,
                  }}
                />

              </div>

            </div>

            {/* IMAGE PREVIEWS */}

            <div className="mt-6">

              <h3 className="font-medium mb-3">
                Captured Images
              </h3>

              <div className="grid grid-cols-5 gap-2">

                {images.map(
                  (image, index) => (
                    <div
                      key={index}
                      className="relative"
                    >

                      <img
                        src={image}
                        alt={`Face ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />

                      {!capturing && (
                        <button
                          onClick={() =>
                            removeImage(index)
                          }
                          className="absolute top-1 right-1 bg-red-600 rounded-full w-6 h-6"
                        >
                          ×
                        </button>
                      )}

                    </div>
                  )
                )}

              </div>

            </div>

          </section>

        </div>

        {/* ================= STATUS ================= */}

        {message && (
          <div className="mt-6 bg-slate-900 border border-slate-700 rounded-xl p-4">
            {message}
          </div>
        )}

        {/* ================= REGISTER ================= */}

        <div className="mt-8 flex justify-center">

          <button
            onClick={registerStudent}
            disabled={
              capturing ||
              images.length !== 5
            }
            className="px-10 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-semibold text-lg"
          >
            Register Student
          </button>

        </div>

      </div>

    </main>
  );
}		