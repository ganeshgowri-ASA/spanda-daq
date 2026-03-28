import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spanda-DAQ | LabVIEW-Inspired VI & DAQ Platform",
  description: "Browser-based virtual instrument design, DAQ integration, and signal processing platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
