import { NextResponse } from 'next/server'

/**
 * PWA Manifest 路由
 * 返回 manifest.json 内容
 */
export async function GET() {
  const manifest = {
    name: "个人目标执行系统",
    short_name: "PES",
    description: "将长期目标拆解为可执行路径，每日唯一任务",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    orientation: "portrait-primary",
    icons: [],
    categories: ["productivity", "lifestyle"],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}

