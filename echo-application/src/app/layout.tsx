import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { PlanStatusProvider } from "@/contexts/PlanStatusContext";
import { PlanningProvider } from "@/contexts/PlanningContext";
import { DevPanel } from "@/components/dev/DevPanel";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daily Planning - Focus & Flow",
  description: "A thoughtful daily planning system with intelligent scheduling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="font-manrope antialiased">
        <PlanStatusProvider>
          <PlanningProvider>
            <div className="flex h-screen bg-background">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
              <DevPanel />
            </div>
          </PlanningProvider>
        </PlanStatusProvider>
      </body>
    </html>
  );
}
