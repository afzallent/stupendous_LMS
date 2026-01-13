"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { djangoApi } from './django-api-client'

interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  is_student: boolean
  is_instructor: boolean
  avatar?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
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

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const userData = await djangoApi.get<User>('/api/user/me/')
        setUser(userData)
      }
    } catch (error) {
      localStorage.removeItem('token')
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
      const userWithRole = {
        ...response.user,
        role: response.user.is_instructor ? 'TRAINER' : (response.user.is_student ? 'STUDENT' : 'ADMIN')
      }
      localStorage.setItem('user', JSON.stringify(userWithRole))
      setUser(response.user)
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      await djangoApi.post('/api/auth/logout/', {})
    } catch (error) {
      // Ignore errors on logout
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
    const response = await djangoApi.post<{ access: string; user: User }>('/api/auth/signup/', data)
    localStorage.setItem('token', response.access)
    setUser(response.user)
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup, updateUser }}>
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

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: 'student' | 'instructor' | 'admin'
) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading && !user) {
        router.push('/auth/login')
      } else if (!loading && user && requiredRole) {
        if (requiredRole === 'instructor' && !user.is_instructor) {
          router.push('/')
        } else if (requiredRole === 'student' && !user.is_student) {
          router.push('/')
        }
      }
    }, [user, loading, router])

    if (loading) {
      return <div>Loading...</div>
    }

    if (!user) {
      return null
    }

    return <Component {...props} />
  }
}
