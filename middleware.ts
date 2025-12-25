import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // 只创建一次 response（供 Supabase 写 cookie 使用）
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          // 确保返回格式正确：{ name: string, value: string }[]
          const cookies = request.cookies.getAll()
          return cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }))
        },
        setAll: (cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 获取用户信息（getUser 会验证 token 的有效性）
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 只保护受保护的路由，未登录时重定向到登录页
  const isProtected = request.nextUrl.pathname.startsWith('/today') ||
                      request.nextUrl.pathname.startsWith('/dashboard') ||
                      request.nextUrl.pathname.startsWith('/goals')

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 其他情况直接放行（包含已登录访问任何页面，未登录访问登录页等）
  return response
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (favicon文件)
     * - public 文件夹中的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

