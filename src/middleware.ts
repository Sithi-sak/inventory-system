import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Protect all dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const adminSession = request.cookies.get('admin-authenticated')
    
    // If no session, redirect to login
    if (!adminSession || adminSession.value !== 'true') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  // If already logged in and trying to access login, redirect to dashboard
  if (request.nextUrl.pathname === '/login') {
    const adminSession = request.cookies.get('admin-authenticated')
    if (adminSession && adminSession.value === 'true') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Allow access to home page and other public routes
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
}