import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ERROR_MESSAGES } from '@/lib/constants/validation'

/**
 * 认证结果
 */
export interface AuthResult {
  user: { id: string }
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
}

/**
 * 认证错误
 */
export class UnauthorizedError extends Error {
  constructor(message: string = ERROR_MESSAGES.UNAUTHORIZED) {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * 要求用户认证
 * 如果未认证，抛出 UnauthorizedError
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new UnauthorizedError()
  }
  
  return { user, supabase }
}

/**
 * 获取认证用户（可选）
 * 如果未认证，返回 null
 */
export async function getAuthUser(): Promise<AuthResult | null> {
  try {
    return await requireAuth()
  } catch {
    return null
  }
}

/**
 * 处理认证错误的响应
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 }
    )
  }
  
  throw error
}

