import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import { ErrorBoundary } from "@/components/error-boundary"
import dynamic from "next/dynamic"
import PWAInstallPrompt from "@/components/pwa-install-prompt"
import ServiceWorkerRegister from "@/components/service-worker-register"
import "./globals.css"

// 动态导入导航组件，禁用 SSR 以避免水合错误
const SidebarNavigation = dynamic(
  () => import("@/components/sidebar-navigation"),
  { ssr: false }
)

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "个人目标执行系统 - PES",
  description: "将长期目标拆解为可执行路径，每日唯一任务",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PES",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <ErrorBoundary>
          <SidebarNavigation />
          <main id="main-content" className="transition-all duration-300">
            {children}
          </main>
          <ServiceWorkerRegister />
          <PWAInstallPrompt />
        </ErrorBoundary>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}

