import { NextRequest, NextResponse } from 'next/server'

console.log('🔧 Middleware module loaded')

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/signup', 
  '/courses',
  '/cart',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/courses',
  '/api/categories',
  '/api/featured-courses',
  '/api/stats',
  '/api/health'
]

export function middleware(request: NextRequest) {
  console.log('🔒 Middleware executing for:', request.nextUrl.pathname)
  
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    console.log('⏭️  Skipping middleware for static/internal file:', pathname)
    return NextResponse.next()
  }

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  if (isPublicRoute) {
    console.log('✅ Public route, allowing access:', pathname)
    return NextResponse.next()
  }

  // For protected routes, check if user has token in localStorage
  // Note: localStorage is client-side only, so we just allow the request
  // and let the client-side auth context handle the redirect
  console.log('🔐 Protected route, allowing request (client-side auth will handle):', pathname)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Include API routes for authentication
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}