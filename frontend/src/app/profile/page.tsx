"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  BookOpen, 
  ArrowLeft, 
  Camera, 
  Save, 
  Shield, 
  Bell, 
  User, 
  Mail, 
  Lock,
  Eye,
  EyeOff,
  Calendar,
  MapPin,
  Globe,
  Phone,
  X
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    bio: "",
    phone: "",
    location: "",
    website: "",
    avatar: null as File | null
  })

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarProgress, setAvatarProgress] = useState(0)

  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorEnabled: false
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    courseUpdates: true,
    marketingEmails: false,
    pushNotifications: true,
    weeklyDigest: true,
    newEnrollments: true,
    courseCompletion: true,
    reviewNotifications: true
  })

  useEffect(() => {
    // Get user from localStorage and populate form
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      setProfileData({
        name: userData.name || "",
        email: userData.email || "",
        bio: userData.bio || "",
        phone: userData.phone || "",
        location: userData.location || "",
        website: userData.website || "",
        avatar: null
      })
    } else {
      // Redirect to login if no user
      router.push('/auth/login')
    }
  }, [router])

  const handleProfileUpdate = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name: profileData.name,
          bio: profileData.bio,
          phone: profileData.phone,
          location: profileData.location,
          website: profileData.website
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Update localStorage with new data
        const updatedUser = { ...user, ...profileData }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
        alert("Profile updated successfully!")
      } else {
        alert("Failed to update profile: " + result.error)
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!user?.id) return

    if (securityData.newPassword !== securityData.confirmPassword) {
      alert("New passwords don't match")
      return
    }

    if (securityData.newPassword.length < 6) {
      alert("New password must be at least 6 characters")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: securityData.currentPassword,
          newPassword: securityData.newPassword
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSecurityData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          twoFactorEnabled: securityData.twoFactorEnabled
        })
        alert("Password changed successfully!")
      } else {
        alert("Failed to change password: " + result.error)
      }
    } catch (error) {
      console.error("Error changing password:", error)
      alert("Failed to change password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationUpdate = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/profile/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          settings: notificationSettings
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert("Notification settings updated successfully!")
      } else {
        alert("Failed to update notification settings: " + result.error)
      }
    } catch (error) {
      console.error("Error updating notifications:", error)
      alert("Failed to update notification settings. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, or WebP)')
      return
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert('File size must be less than 2MB')
      return
    }

    setUploadingAvatar(true)
    setAvatarProgress(0)
    
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      formData.append('userId', user.id)
      formData.append('replaceExisting', 'true')

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        // Update user data with new avatar URL
        const updatedUser = { ...user, avatar: result.data.avatar.url }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
        
        alert('Avatar updated successfully!')
      } else {
        alert('Failed to upload avatar: ' + result.error)
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      alert('Failed to upload avatar. Please try again.')
    } finally {
      setUploadingAvatar(false)
      setAvatarProgress(0)
      // Clear the file input
      e.target.value = ''
    }
  }

  const handleAvatarDelete = async () => {
    if (!user?.avatar || !user.id) return

    if (!confirm('Are you sure you want to remove your profile picture?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/upload/avatar?userId=${user.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        // Update user data to remove avatar
        const updatedUser = { ...user, avatar: null }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
        
        alert('Profile picture removed successfully!')
      } else {
        alert('Failed to remove profile picture: ' + result.error)
      }
    } catch (error) {
      console.error('Avatar delete error:', error)
      alert('Failed to remove profile picture. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getDashboardLink = () => {
    switch (user?.role) {
      case 'STUDENT':
        return '/learn'
      case 'TRAINER':
      case 'INSTRUCTOR':
        return '/instructor'
      case 'ADMIN':
        return '/admin'
      default:
        return '/'
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={getDashboardLink()} className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">CourseCompass</span>
              </Link>
              <div className="hidden md:flex items-center space-x-2 text-sm">
                <span className="text-muted-foreground">Profile Settings</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push(getDashboardLink())}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={user.avatar ? (user.avatar.startsWith('/uploads/') ? `/api/files/${user.avatar.substring(9)}` : user.avatar) : undefined} 
                    />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {user.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <div className="text-white text-xs font-medium">
                        {avatarProgress > 0 ? `${avatarProgress}%` : 'Uploading...'}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 flex space-x-1">
                    <Button
                      size="sm"
                      className="rounded-full h-8 w-8 p-0"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={uploadingAvatar}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    {user.avatar && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-full h-8 w-8 p-0"
                        onClick={handleAvatarDelete}
                        disabled={uploadingAvatar || isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </div>
                
                <h2 className="text-xl font-bold mb-1">{user.name || 'User'}</h2>
                <p className="text-muted-foreground mb-3">{user.email}</p>
                
                <Badge variant="secondary" className="mb-4">
                  {user.role === 'TRAINER' ? 'INSTRUCTOR' : user.role}
                </Badge>
                
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span>Member since</span>
                  </div>
                  <p>{new Date(user.createdAt || Date.now()).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="certificates">Certificates</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your account profile information and email address.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter your full name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email cannot be changed. Contact support for assistance.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself..."
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={profileData.location}
                          onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="City, Country"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={profileData.website}
                        onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleProfileUpdate} disabled={isLoading}>
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>
                        Update your password to keep your account secure.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="current-password"
                            type={showCurrentPassword ? "text" : "password"}
                            value={securityData.currentPassword}
                            onChange={(e) => setSecurityData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder="Enter current password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            value={securityData.newPassword}
                            onChange={(e) => setSecurityData(prev => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="Enter new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={securityData.confirmPassword}
                            onChange={(e) => setSecurityData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirm new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handlePasswordChange} disabled={isLoading}>
                          <Lock className="h-4 w-4 mr-2" />
                          {isLoading ? "Changing..." : "Change Password"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Two-Factor Authentication</CardTitle>
                      <CardDescription>
                        Add an extra layer of security to your account.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Enable Two-Factor Authentication</h4>
                          <p className="text-sm text-muted-foreground">
                            Secure your account with 2FA using your phone
                          </p>
                        </div>
                        <Switch
                          checked={securityData.twoFactorEnabled}
                          onCheckedChange={(checked) => 
                            setSecurityData(prev => ({ ...prev, twoFactorEnabled: checked }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Choose what notifications you want to receive.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Email Notifications</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive notifications via email
                          </p>
                        </div>
                        <Switch
                          checked={notificationSettings.emailNotifications}
                          onCheckedChange={(checked) => 
                            setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Course Updates</h4>
                          <p className="text-sm text-muted-foreground">
                            Get notified about course updates and new content
                          </p>
                        </div>
                        <Switch
                          checked={notificationSettings.courseUpdates}
                          onCheckedChange={(checked) => 
                            setNotificationSettings(prev => ({ ...prev, courseUpdates: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Marketing Emails</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive promotional emails and special offers
                          </p>
                        </div>
                        <Switch
                          checked={notificationSettings.marketingEmails}
                          onCheckedChange={(checked) => 
                            setNotificationSettings(prev => ({ ...prev, marketingEmails: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Push Notifications</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive push notifications on your device
                          </p>
                        </div>
                        <Switch
                          checked={notificationSettings.pushNotifications}
                          onCheckedChange={(checked) => 
                            setNotificationSettings(prev => ({ ...prev, pushNotifications: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Weekly Digest</h4>
                          <p className="text-sm text-muted-foreground">
                            Get a weekly summary of your learning progress
                          </p>
                        </div>
                        <Switch
                          checked={notificationSettings.weeklyDigest}
                          onCheckedChange={(checked) => 
                            setNotificationSettings(prev => ({ ...prev, weeklyDigest: checked }))
                          }
                        />
                      </div>

                      {user.role === 'TRAINER' && (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">New Enrollments</h4>
                              <p className="text-sm text-muted-foreground">
                                Get notified when students enroll in your courses
                              </p>
                            </div>
                            <Switch
                              checked={notificationSettings.newEnrollments}
                              onCheckedChange={(checked) => 
                                setNotificationSettings(prev => ({ ...prev, newEnrollments: checked }))
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Course Completion</h4>
                              <p className="text-sm text-muted-foreground">
                                Get notified when students complete your courses
                              </p>
                            </div>
                            <Switch
                              checked={notificationSettings.courseCompletion}
                              onCheckedChange={(checked) => 
                                setNotificationSettings(prev => ({ ...prev, courseCompletion: checked }))
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Review Notifications</h4>
                              <p className="text-sm text-muted-foreground">
                                Get notified when students leave reviews
                              </p>
                            </div>
                            <Switch
                              checked={notificationSettings.reviewNotifications}
                              onCheckedChange={(checked) => 
                                setNotificationSettings(prev => ({ ...prev, reviewNotifications: checked }))
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleNotificationUpdate} disabled={isLoading}>
                        <Bell className="h-4 w-4 mr-2" />
                        {isLoading ? "Saving..." : "Save Preferences"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Certificates Tab */}
              <TabsContent value="certificates">
                <Card>
                  <CardHeader>
                    <CardTitle>My Certificates</CardTitle>
                    <CardDescription>
                      View and manage all your course completion certificates.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Certificates</h3>
                      <p className="text-muted-foreground mb-6">
                        View all your course completion certificates in one place.
                      </p>
                      <Button onClick={() => router.push("/profile/certificates")}>
                        View All Certificates
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}