import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Convergence — fair trips for scattered friends",
  description:
    "Each friend sets their airport, budget, and availability. Convergence proposes a trip that's fair to everyone.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-slate-900" suppressHydrationWarning>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-xs text-white">C</span>
              Convergence
            </Link>
            <span className="text-xs text-slate-400">the agent proposes; humans dispose</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
