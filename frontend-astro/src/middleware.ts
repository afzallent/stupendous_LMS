// Django JWT Authentication Middleware
// This middleware checks for JWT tokens and protects routes

import { defineMiddleware } from 'astro:middleware';

// Define protected routes
const protectedRoutes = [
  '/dashboard',
  '/course-player',
];

// Define instructor-only routes
const instructorRoutes = [
  '/dashboard/trainer',
  '/admin',
];

// Define student-only routes  
const studentRoutes = [
  '/dashboard/student',
];

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

function isInstructorRoute(pathname: string): boolean {
  return instructorRoutes.some(route => pathname.startsWith(route));
}

function isStudentRoute(pathname: string): boolean {
  return studentRoutes.some(route => pathname.startsWith(route));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  
  // Skip middleware for login pages and public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api') || pathname === '/') {
    return next();
  }
  
  // Check if the route is protected
  if (isProtectedRoute(pathname)) {
    // Check for access token in cookies or headers
    const accessToken = context.cookies.get('access_token')?.value;
    
    // If no token, redirect to login
    if (!accessToken) {
      // Determine which login page based on the path
      const loginUrl = isInstructorRoute(pathname) 
        ? '/login/trainer' 
        : '/login/student';
      
      return context.redirect(loginUrl);
    }
    
    // Token exists, allow the request to proceed
    // Role-based access will be checked client-side or in the page component
  }
  
  return next();
});
