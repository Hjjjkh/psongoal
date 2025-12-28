import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/today'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 验证成功，重定向到目标页面
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // 如果有错误或没有 code，重定向到登录页
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
}

