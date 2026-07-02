import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexus Sport — Predicciones Mundial 2026",
  description:
    "Predicciones con IA y modelos estadísticos para la fase eliminatoria del Mundial 2026",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={geist.variable}>
      <body style={{ background: "#0B1220", margin: 0, minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
