import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractTokenFromRequest } from '@/lib/jwt'

console.log('🔧 Middleware module loaded')

// Define protected routes patterns
const protectedRoutes = [
  '/admin',
  '/instructor', 
  '/learn',
  '/profile',
  '/api/courses/create',
  '/api/courses/draft',
  '/api/instructor',
  '/api/profile',
  '/api/student'
]

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

// Define role-based route access
const roleBasedRoutes = {
  '/admin': ['ADMIN'],
  '/instructor': ['TRAINER', 'ADMIN'],
  '/api/instructor': ['TRAINER', 'ADMIN'],
  '/learn': ['STUDENT', 'TRAINER', 'ADMIN'],
  '/api/student': ['STUDENT', 'TRAINER', 'ADMIN']
}

export async function middleware(request: NextRequest) {
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

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  if (!isProtectedRoute) {
    console.log('🟡 Route not in protected list, allowing access:', pathname)
    return NextResponse.next()
  }

  console.log('🔐 Protected route detected, checking authentication:', pathname)

  // Extract and verify token
  const token = extractTokenFromRequest(request)
  
  console.log('🎫 Token extraction result:', {
    hasToken: !!token,
    tokenLength: token?.length || 0,
    authHeader: !!request.headers.get('authorization'),
    hasCookie: !!request.cookies.get('auth-token')
  })
  
  if (!token) {
    console.log('❌ No token found, redirecting to login')
    // Redirect to login for browser requests
    if (request.headers.get('accept')?.includes('text/html')) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      console.log('🔄 Redirecting to:', loginUrl.toString())
      return NextResponse.redirect(loginUrl)
    }
    
    // Return 401 for API requests
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // Verify token
  try {
    const payload = await verifyAccessToken(token)
    
    console.log('🔍 Token verification result:', {
      isValid: !!payload,
      userId: payload?.userId,
      role: payload?.role,
      email: payload?.email
    })
    
    if (!payload) {
      console.log('❌ Token verification failed, redirecting to login')
      // Token is invalid, clear cookies and redirect/respond accordingly
      const response = request.headers.get('accept')?.includes('text/html')
        ? NextResponse.redirect(new URL('/auth/login', request.url))
        : NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
      
      // Clear auth cookies
      response.cookies.delete('auth-token')
      response.cookies.delete('refresh-token')
      
      return response
    }

    // Check role-based access
    const requiredRoles = Object.entries(roleBasedRoutes).find(([route]) => 
      pathname === route || pathname.startsWith(route + '/')
    )?.[1]

    if (requiredRoles && !requiredRoles.includes(payload.role)) {
      console.log('❌ Insufficient permissions for role:', payload.role, 'required:', requiredRoles)
      // Insufficient permissions
      if (request.headers.get('accept')?.includes('text/html')) {
        return NextResponse.redirect(new URL('/', request.url))
      }
      
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    console.log('✅ Authentication successful, allowing access')
    
    // Add user info to request headers for API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-role', payload.role)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    
  } catch (error) {
    console.error('❌ Middleware error:', error)
    
    // Handle token verification errors
    const response = request.headers.get('accept')?.includes('text/html')
      ? NextResponse.redirect(new URL('/auth/login', request.url))
      : NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    
    response.cookies.delete('auth-token')
    response.cookies.delete('refresh-token')
    
    return response
  }
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