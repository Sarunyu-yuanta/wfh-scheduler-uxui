import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "./_components/NavBar";
import { TabNav } from "./_components/TabNav";

export const metadata: Metadata = {
  title: "WFH Scheduler",
  description: "สุ่มวัน Work From Home สำหรับทีม",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <NavBar />
        <TabNav />
        {children}
      </body>
    </html>
  );
}
