"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { djangoApi } from './django-api-client'

export interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  is_student: boolean
  is_instructor: boolean
  is_staff?: boolean
  avatar?: string
  avatar_url?: string | null
  preferred_language?: string
  /**
   * Convenience display name. Several pages read `user.name`; it is derived
   * from first/last name rather than returned by the API.
   */
  name?: string
  /**
   * Role label derived from the boolean flags at login time and persisted to
   * localStorage for pages that read it directly.
   */
  role?: 'TRAINER' | 'STUDENT' | 'ADMIN'
}

/** Derive the display name and role label the UI expects from an API user. */
export function decorateUser(user: User): User {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return {
    ...user,
    name: fullName || user.username,
    role: user.is_instructor ? 'TRAINER' : user.is_student ? 'STUDENT' : 'ADMIN',
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  signup: (data: SignupData) => Promise<void>
  updateUser: (user: User) => void
}

interface SignupData {
  email: string
  username: string
  password: string
  password_confirm: string
  is_student?: boolean
  is_instructor?: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  // The API client emits this when a refresh fails and the session cannot be
  // recovered, so an expired session lands on the login page instead of
  // leaving the UI in a signed-in state that 401s on every request.
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null)
      router.push('/auth/login')
    }
    window.addEventListener('auth:session-expired', handleSessionExpired)
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired)
  }, [router])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const userData = await djangoApi.get<User>('/api/user/me/')
        setUser(decorateUser(userData))
      }
    } catch (error) {
      // The client already cleared storage and signalled expiry if the
      // refresh failed; just make sure no stale access token lingers.
      localStorage.removeItem('token')
      localStorage.removeItem('access_token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await djangoApi.post<{ access: string; refresh?: string; user: User }>('/api/auth/login/', {
        email,
        password,
      })
      // Store tokens with both key names for compatibility
      localStorage.setItem('token', response.access)
      localStorage.setItem('access_token', response.access)
      if (response.refresh) {
        localStorage.setItem('refresh_token', response.refresh)
      }
      // Store user data for pages that check localStorage directly
      const userWithRole = decorateUser(response.user)
      localStorage.setItem('user', JSON.stringify(userWithRole))
      setUser(userWithRole)
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      // The server blacklists the refresh token, so it must be sent —
      // omitting it left the token valid for its full 7-day lifetime.
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        await djangoApi.post('/api/auth/logout/', { refresh })
      }
    } catch (error) {
      // Ignore errors on logout; local state is cleared either way.
    }
    // Clear all auth-related localStorage items
    localStorage.removeItem('token')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/auth/login')
  }

  const signup = async (data: SignupData) => {
    const response = await djangoApi.post<{ access: string; refresh?: string; user: User }>(
      '/api/auth/signup/',
      data,
    )
    localStorage.setItem('token', response.access)
    localStorage.setItem('access_token', response.access)
    // Without the refresh token a freshly registered user was logged out
    // 15 minutes later with no way to recover the session.
    if (response.refresh) {
      localStorage.setItem('refresh_token', response.refresh)
    }
    const userWithRole = decorateUser(response.user)
    localStorage.setItem('user', JSON.stringify(userWithRole))
    setUser(userWithRole)
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
  }

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout, signup, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export type AuthRole = 'student' | 'instructor' | 'admin'

/** True if `user` holds `role`. Admin is derived from the is_staff flag. */
function userHasRole(user: User, role: AuthRole): boolean {
  switch (role) {
    case 'instructor':
      return Boolean(user.is_instructor)
    case 'student':
      return Boolean(user.is_student)
    case 'admin':
      return Boolean(user.is_staff)
  }
}

/**
 * Higher-order component for protected routes.
 *
 * Accepts a single role or a list, in any casing. Callers were passing
 * `['ADMIN']` while the previous signature expected the lowercase string
 * 'admin', so the comparison never matched and NO role check ran — the admin
 * dashboard was reachable by any signed-in user. The 'admin' case was also
 * absent from the original body, so it was unenforceable even when matched.
 *
 * This is defence in depth for UX only; the API enforces authorisation
 * server-side and is the actual boundary.
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: AuthRole | AuthRole[] | string | string[]
) {
  const requiredRoles: AuthRole[] = (
    requiredRole === undefined
      ? []
      : Array.isArray(requiredRole)
        ? requiredRole
        : [requiredRole]
  )
    .map((role) => String(role).toLowerCase())
    // Tolerate the 'TRAINER' label used elsewhere in the UI.
    .map((role) => (role === 'trainer' ? 'instructor' : role))
    .filter((role): role is AuthRole =>
      role === 'student' || role === 'instructor' || role === 'admin'
    )

  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth()
    const router = useRouter()

    const authorised =
      Boolean(user) &&
      (requiredRoles.length === 0 ||
        requiredRoles.some((role) => userHasRole(user as User, role)))

    useEffect(() => {
      if (loading) return
      if (!user) {
        router.push('/auth/login')
      } else if (!authorised) {
        router.push('/')
      }
    }, [user, loading, authorised, router])

    if (loading) {
      return <div>Loading...</div>
    }

    if (!user || !authorised) {
      return null
    }

    return <Component {...props} />
  }
}
