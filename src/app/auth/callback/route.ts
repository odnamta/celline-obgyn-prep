import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Auth callback route for OAuth providers (Google, etc.)
 * Exchanges the auth code for a session and redirects to dashboard
 * Requirements: 5.3 - Redirect to /dashboard on success
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // Redirect to login with error
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  // Redirect to dashboard on success
  return NextResponse.redirect(`${origin}/dashboard`)
}
