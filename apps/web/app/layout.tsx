import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { DesktopNav } from "@/components/nav/desktop-nav";
import { MobileTabBar } from "@/components/nav/mobile-tab-bar";

export const metadata: Metadata = {
  title: "逐成 AI · StepDone AI",
  description: "一步一步，把事情做成。真实任务交付平台。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full flex flex-col page-with-tabs">
        <AppProviders>
          <div className="desktop-only-nav" style={{ display: "none" }}>
            <DesktopNav />
          </div>
          <main style={{ flex: 1 }}>{children}</main>
          <MobileTabBar />
        </AppProviders>
      </body>
    </html>
  );
}
