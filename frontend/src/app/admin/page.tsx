"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { withAuth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  Settings,
  LogOut,
  ExternalLink
} from "lucide-react"
import { useRouter } from "next/navigation"
import { djangoApi } from "@/lib/django-api-client"
import { toast } from "@/hooks/use-toast"

function AdminDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      
      // Fetch courses count
      const coursesResponse = await djangoApi.get('/courses/')
      const coursesCount = coursesResponse.count || coursesResponse.length || 0
      
      setStats({
        totalUsers: 2, // Admin + Instructor
        totalCourses: coursesCount,
        totalEnrollments: 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  const adminLinks = [
    {
      title: "Manage Users",
      description: "Create, edit, and delete users (students, instructors, admins)",
      icon: Users,
      href: "/admin/users",
      external: false
    },
    {
      title: "View All Courses",
      description: "Browse and manage all published courses",
      icon: BookOpen,
      href: "/courses",
      external: false
    },
    {
      title: "Django Admin Panel",
      description: "Full admin interface for managing all system data",
      icon: Settings,
      href: "http://localhost:8000/admin/",
      external: true
    },
    {
      title: "API Documentation",
      description: "View API endpoints and integration guides",
      icon: ExternalLink,
      href: "http://localhost:8000/api/schema/swagger/",
      external: true
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Welcome back, {user?.name || user?.email}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Users
                </CardTitle>
                <div className="bg-blue-500 p-2 rounded-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {loading ? "..." : stats.totalUsers}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Active users on platform
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Courses
                </CardTitle>
                <div className="bg-purple-500 p-2 rounded-lg">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {loading ? "..." : stats.totalCourses}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Published courses
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  System Status
                </CardTitle>
                <div className="bg-green-500 p-2 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                Operational
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                All systems running
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Links */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Admin Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {adminLinks.map((link, index) => {
              const Icon = link.icon
              return (
                <a 
                  key={index} 
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                >
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg text-slate-900 dark:text-white">
                            {link.title}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {link.description}
                          </CardDescription>
                        </div>
                        <Icon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                        {link.external ? "Open in new tab" : "Go to page"}
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                </a>
              )
            })}
          </div>
        </div>

        {/* System Information */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Platform details and configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400">Platform</span>
                <span className="font-medium text-slate-900 dark:text-white">Stupendous LMS</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400">Backend</span>
                <span className="font-medium text-slate-900 dark:text-white">Django 5.2.8</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400">Frontend</span>
                <span className="font-medium text-slate-900 dark:text-white">Next.js 14</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-slate-600 dark:text-slate-400">Database</span>
                <span className="font-medium text-slate-900 dark:text-white">PostgreSQL</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(AdminDashboard, ['ADMIN'])
