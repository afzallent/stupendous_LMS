"use client"

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
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

function AdminDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  const adminStats = [
    {
      title: "Total Users",
      value: "1,234",
      description: "Active users on platform",
      icon: Users,
      color: "bg-blue-500"
    },
    {
      title: "Total Courses",
      value: "5",
      description: "Published courses",
      icon: BookOpen,
      color: "bg-purple-500"
    },
    {
      title: "Total Enrollments",
      value: "892",
      description: "Active enrollments",
      icon: BarChart3,
      color: "bg-green-500"
    },
    {
      title: "System Health",
      value: "99.9%",
      description: "Uptime this month",
      icon: Settings,
      color: "bg-orange-500"
    }
  ]

  const adminActions = [
    {
      title: "Manage Users",
      description: "View and manage all users on the platform",
      href: "/admin/users",
      icon: Users
    },
    {
      title: "Manage Courses",
      description: "Create, edit, and manage courses",
      href: "/admin/courses",
      icon: BookOpen
    },
    {
      title: "View Analytics",
      description: "View detailed analytics and reports",
      href: "/admin/analytics",
      icon: BarChart3
    },
    {
      title: "System Settings",
      description: "Configure system settings and preferences",
      href: "/admin/settings",
      icon: Settings
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {adminStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {stat.title}
                    </CardTitle>
                    <div className={`${stat.color} p-2 rounded-lg`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Admin Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {adminActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Link key={index} href={action.href}>
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg text-slate-900 dark:text-white">
                            {action.title}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {action.description}
                          </CardDescription>
                        </div>
                        <Icon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                        Go to {action.title}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">New user registration</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">John Doe registered</p>
                </div>
                <span className="text-xs text-slate-500">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Course published</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Advanced JavaScript & React</p>
                </div>
                <span className="text-xs text-slate-500">5 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">System update</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Database optimization completed</p>
                </div>
                <span className="text-xs text-slate-500">1 day ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(AdminDashboard, ['ADMIN'])
