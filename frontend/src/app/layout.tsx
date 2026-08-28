import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "SmartAttend",
  description: "Face Recognition Attendance Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f6f8fc] text-slate-900 antialiased">
        <Sidebar />

        <div className="min-h-screen lg:ml-[270px]">
          {children}
        </div>
      </body>
    </html>
  );
}
