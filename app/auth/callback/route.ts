import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function getSiteUrl(request: Request): string {
  // 优先使用环境变量
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  // 从请求头获取（Zeabur 等平台会设置这些头）
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const host = request.headers.get('host')

  if (forwardedHost) {
    const protocol = forwardedProto || 'https'
    return `${protocol}://${forwardedHost}`
  }

  if (host) {
    // 判断协议（本地开发使用 http，线上使用 https）
    const protocol = forwardedProto || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https')
    return `${protocol}://${host}`
  }

  // 默认值（线上环境）
  return 'https://psongoal.zeabur.app'
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/today'
  const siteUrl = getSiteUrl(request)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 验证成功，重定向到目标页面
      return NextResponse.redirect(new URL(next, siteUrl))
    }
  }

  // 如果有错误或没有 code，重定向到登录页
  return NextResponse.redirect(new URL('/auth/login', siteUrl))
}

