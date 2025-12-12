import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') || 'http://localhost:3000'
  const allowedOrigins = [
    'http://localhost:3000',
    'https://dutyfree-frontend-pro.vercel.app'
  ]
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  // ✅ 1. OPTIONS preflight CORS
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    return response
  }

  const pathname = request.nextUrl.pathname

  // ✅ 2. TOUTES les API routes = SKIP AUTH + CORS
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Expose-Headers', 'Set-Cookie')
    return response
  }

  // ✅ 3. Routes publiques (pages seulement)
  const publicRoutes = ['/', '/login', '/unauthorized']
  const isPublic = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  // ✅ 4. Auth seulement pour pages (PAS API)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => 
            NextResponse.next({ request }).cookies.set(name, value, options)
          )
        }
      }
    }
  )

  const { data: { session }, error } = await supabase.auth.getSession()
  const hasValidSession = session && !error
  const userRole = request.cookies.get('user_role')?.value

  // ✅ 5. Redirection login (pages seulement)
  if (!hasValidSession && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    return response
  }

  // ✅ 6. Admin requis (pages seulement)
  if (hasValidSession && 
      (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) && 
      userRole !== 'admin') {
    const response = NextResponse.redirect(new URL('/unauthorized', request.url))
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    return response
  }

  // ✅ 7. Refresh session + CORS final
  if (hasValidSession) {
    await supabase.auth.getUser()
  }

  const response = NextResponse.next()
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Expose-Headers', 'Set-Cookie')
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
