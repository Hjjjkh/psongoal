import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // 在浏览器环境中，环境变量通过 NEXT_PUBLIC_ 前缀暴露
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing Supabase environment variables:', {
      url: !!url,
      key: !!key,
      urlValue: url ? `${url.substring(0, 20)}...` : 'undefined',
      keyValue: key ? `${key.substring(0, 20)}...` : 'undefined',
    })
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  try {
    const client = createBrowserClient(url, key)
    return client
  } catch (error) {
    console.error('Error creating Supabase client:', error)
    throw error
  }
}

