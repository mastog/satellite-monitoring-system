import type { Metadata } from "next";
import { Orbitron, Fira_Code, Exo_2 } from "next/font/google";
import "./globals.css";
import ClientShell from "@/components/layout/ClientShell";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Satellite Monitoring System",
  description:
    "Real-time satellite tracking, space debris visualization, and UN SDG assessment platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${orbitron.variable} ${firaCode.variable} ${exo2.variable} antialiased`}
        style={{ fontFamily: "var(--font-exo2), sans-serif" }}
      >
        <div className="ambient-glow-tl" />
        <div className="ambient-glow-br" />
        <div className="noise-overlay" />
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
