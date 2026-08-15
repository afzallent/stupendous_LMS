"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { withAuth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Plus, 
  Edit2, 
  Trash2,
  ArrowLeft,
  Search,
  Key
} from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

interface User {
  // Django returns an integer primary key. This was declared as `string`,
  // so the `u.id === user?.id` self-delete guard compared a string to a
  // number and never matched — an admin could delete their own account.
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_student: boolean
  is_instructor: boolean
  is_staff: boolean
}

function AdminUsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState("")
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    is_student: false,
    is_instructor: false,
    is_staff: false,
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const accessToken = localStorage.getItem('access_token')
      
      if (!accessToken) {
        toast({
          title: "Error",
          description: "Not authenticated",
          variant: "destructive"
        })
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/users/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Users data:', data)
      setUsers(Array.isArray(data) ? data : data.results || [])
    } catch (error: any) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load users",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      if (!formData.username || !formData.email || !formData.password) {
        toast({
          title: "Validation Error",
          description: "Username, email, and password are required",
          variant: "destructive"
        })
        return
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const accessToken = localStorage.getItem('access_token')

      const response = await fetch(`${API_BASE_URL}/api/users/create_user/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create user')
      }

      const newUser = await response.json()
      setUsers([...users, newUser])
      setFormData({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        is_student: false,
        is_instructor: false,
        is_staff: false,
      })
      setShowCreateDialog(false)
      toast({
        title: "Success",
        description: "User created successfully"
      })
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive"
      })
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const accessToken = localStorage.getItem('access_token')

      const response = await fetch(`${API_BASE_URL}/api/users/${editingUser.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          is_student: editingUser.is_student,
          is_instructor: editingUser.is_instructor,
          is_staff: editingUser.is_staff,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update user')
      }

      const updatedUser = await response.json()
      setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u))
      setEditingUser(null)
      setShowEditDialog(false)
      toast({
        title: "Success",
        description: "User updated successfully"
      })
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async () => {
    if (!deletingUser) return

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const accessToken = localStorage.getItem('access_token')

      const response = await fetch(`${API_BASE_URL}/api/users/${deletingUser.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to delete user')
      }

      setUsers(users.filter(u => u.id !== deletingUser.id))
      setDeletingUser(null)
      setShowDeleteDialog(false)
      toast({
        title: "Success",
        description: "User deleted successfully"
      })
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      })
    }
  }

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) {
      toast({
        title: "Validation Error",
        description: "Password is required",
        variant: "destructive"
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters",
        variant: "destructive"
      })
      return
    }

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const accessToken = localStorage.getItem('access_token')

      const response = await fetch(`${API_BASE_URL}/api/users/${resetPasswordUser.id}/reset_password/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: newPassword })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to reset password')
      }

      setResetPasswordUser(null)
      setNewPassword("")
      setShowResetPasswordDialog(false)
      toast({
        title: "Success",
        description: `Password reset successfully for ${resetPasswordUser.username}`
      })
    } catch (error: any) {
      console.error('Error resetting password:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive"
      })
    }
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleColor = (user: User) => {
    if (user.is_staff) return "bg-red-100 text-red-800"
    if (user.is_instructor) return "bg-blue-100 text-blue-800"
    if (user.is_student) return "bg-green-100 text-green-800"
    return "bg-gray-100 text-gray-800"
  }

  const getRoleLabel = (user: User) => {
    if (user.is_staff) return "Admin"
    if (user.is_instructor) return "Instructor"
    if (user.is_student) return "Student"
    return "User"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Manage students, instructors, and admins</p>
              </div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>Add a new user to the system</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>User Roles</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_student"
                        checked={formData.is_student}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_student: checked as boolean })}
                      />
                      <Label htmlFor="is_student" className="font-normal cursor-pointer">Student</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_instructor"
                        checked={formData.is_instructor}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_instructor: checked as boolean })}
                      />
                      <Label htmlFor="is_instructor" className="font-normal cursor-pointer">Instructor</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_staff"
                        checked={formData.is_staff}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_staff: checked as boolean })}
                      />
                      <Label htmlFor="is_staff" className="font-normal cursor-pointer">Admin</Label>
                    </div>
                  </div>
                  <Button onClick={handleCreateUser} className="w-full">Create User</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <Card className="mb-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username, email, or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>{filteredUsers.length} users found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.first_name} {u.last_name}</TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(u)}>
                          {getRoleLabel(u)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUser(u)
                              setShowEditDialog(true)
                            }}
                            title="Edit user"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResetPasswordUser(u)
                              setNewPassword("")
                              setShowResetPasswordDialog(true)
                            }}
                            title="Reset password"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeletingUser(u)
                              setShowDeleteDialog(true)
                            }}
                            disabled={u.id === user?.id}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and roles</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>Username</Label>
                <Input value={editingUser.username} disabled />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={editingUser.email} disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_first_name">First Name</Label>
                  <Input
                    id="edit_first_name"
                    value={editingUser.first_name}
                    onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    value={editingUser.last_name}
                    onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>User Roles</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_is_student"
                    checked={editingUser.is_student}
                    onCheckedChange={(checked) => setEditingUser({ ...editingUser, is_student: checked as boolean })}
                  />
                  <Label htmlFor="edit_is_student" className="font-normal cursor-pointer">Student</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_is_instructor"
                    checked={editingUser.is_instructor}
                    onCheckedChange={(checked) => setEditingUser({ ...editingUser, is_instructor: checked as boolean })}
                  />
                  <Label htmlFor="edit_is_instructor" className="font-normal cursor-pointer">Instructor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_is_staff"
                    checked={editingUser.is_staff}
                    onCheckedChange={(checked) => setEditingUser({ ...editingUser, is_staff: checked as boolean })}
                  />
                  <Label htmlFor="edit_is_staff" className="font-normal cursor-pointer">Admin</Label>
                </div>
              </div>
              <Button onClick={handleUpdateUser} className="w-full">Update User</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Password must be at least 8 characters long
              </p>
            </div>
            <Button onClick={handleResetPassword} className="w-full">
              Reset Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingUser?.username}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default withAuth(AdminUsersPage, ['ADMIN'])
