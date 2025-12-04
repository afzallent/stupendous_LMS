"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Settings, 
  Save, 
  Shield, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle,
  Loader2,
  LogOut,
  User
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface SSOProvider {
  id: string
  name: string
  displayName: string
  clientId: string
  clientSecret: string
  enabled: boolean
  scopes?: string
}

const defaultProviders = [
  {
    name: "google",
    displayName: "Google",
    icon: "🔵",
    description: "Allow users to sign in with their Google accounts",
    defaultScopes: ["openid", "email", "profile"]
  },
  {
    name: "facebook", 
    displayName: "Facebook",
    icon: "🔷",
    description: "Allow users to sign in with their Facebook accounts",
    defaultScopes: ["email"]
  },
  {
    name: "linkedin",
    displayName: "LinkedIn", 
    icon: "🔹",
    description: "Allow users to sign in with their LinkedIn accounts",
    defaultScopes: ["openid", "profile", "email"]
  }
]

export default function SSOSettingsPage() {
  const router = useRouter()
  const [providers, setProviders] = useState<SSOProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<SSOProvider>>({})
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const handleLogout = async () => {
    console.log('Admin logout clicked')
    try {
      // Clear local storage immediately
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      
      // Call logout API (optional, for server-side cleanup)
      fetch('/api/auth/logout', {
        method: 'POST',
      }).catch(err => console.log('Logout API error:', err))
      
      // Redirect to home page immediately
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, still redirect
      window.location.href = '/'
    }
  }

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/admin/sso-providers')
      if (response.ok) {
        const data = await response.json()
        setProviders(data.providers || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load SSO providers",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to load providers:', error)
      toast({
        title: "Error", 
        description: "Failed to load SSO providers",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (provider: SSOProvider) => {
    setEditingProvider(provider.id)
    setFormData({
      ...provider,
      scopes: provider.scopes || JSON.stringify(
        defaultProviders.find(p => p.name === provider.name)?.defaultScopes || []
      )
    })
  }

  const handleCancel = () => {
    setEditingProvider(null)
    setFormData({})
  }

  const handleSave = async () => {
    if (!editingProvider || !formData) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/admin/sso-providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProvider,
          ...formData
        })
      })

      if (response.ok) {
        await loadProviders()
        setEditingProvider(null)
        setFormData({})
        toast({
          title: "Success",
          description: "SSO provider updated successfully"
        })
      } else {
        throw new Error('Failed to update provider')
      }
    } catch (error) {
      console.error('Failed to save provider:', error)
      toast({
        title: "Error",
        description: "Failed to update SSO provider",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async (providerName: string) => {
    const defaultProvider = defaultProviders.find(p => p.name === providerName)
    if (!defaultProvider) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/sso-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: providerName,
          displayName: defaultProvider.displayName,
          clientId: '',
          clientSecret: '',
          enabled: false,
          scopes: JSON.stringify(defaultProvider.defaultScopes)
        })
      })

      if (response.ok) {
        await loadProviders()
        toast({
          title: "Success", 
          description: `${defaultProvider.displayName} provider created`
        })
      } else {
        throw new Error('Failed to create provider')
      }
    } catch (error) {
      console.error('Failed to create provider:', error)
      toast({
        title: "Error",
        description: "Failed to create SSO provider",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleShowSecret = (providerId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }))
  }

  const getProviderStatus = (provider: SSOProvider) => {
    const hasCredentials = provider.clientId && provider.clientSecret
    const isEnabled = provider.enabled

    if (isEnabled && hasCredentials) {
      return { status: 'active', label: 'Active', icon: CheckCircle, color: 'bg-green-500' }
    } else if (hasCredentials) {
      return { status: 'configured', label: 'Configured', icon: Settings, color: 'bg-yellow-500' }
    } else {
      return { status: 'inactive', label: 'Not Configured', icon: XCircle, color: 'bg-red-500' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-8 w-8 text-primary" />
                  <span className="text-2xl font-bold">Admin Portal</span>
                </div>
                <nav className="hidden md:flex items-center space-x-6">
                  <a href="/" className="text-sm font-medium hover:text-primary">Platform</a>
                  <a href="/admin" className="text-sm font-medium hover:text-primary">Admin</a>
                  <a href="/admin/sso-settings" className="text-sm font-medium text-primary flex items-center">
                    <Settings className="h-4 w-4 mr-1" />
                    SSO Settings
                  </a>
                </nav>
              </div>
              <div className="flex items-center space-x-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar>
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="bg-red-100 text-red-600">
                          {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'A'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user?.name || 'Admin User'}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user?.email || 'admin@example.com'}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onSelect={(e) => {
                        e.preventDefault()
                        router.push('/profile')
                      }}
                      className="cursor-pointer"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => console.log('Settings clicked')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onSelect={(e) => {
                        e.preventDefault()
                        console.log('Admin logout menu item clicked')
                        handleLogout()
                      }}
                      className="cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <Loader2 className="h-8 w-8 animate-spin" />
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
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">Admin Portal</span>
              </div>
              <nav className="hidden md:flex items-center space-x-6">
                <a href="/" className="text-sm font-medium hover:text-primary">Platform</a>
                <a href="/admin" className="text-sm font-medium hover:text-primary">Admin</a>
                <a href="/admin/sso-settings" className="text-sm font-medium text-primary flex items-center">
                  <Settings className="h-4 w-4 mr-1" />
                  SSO Settings
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-red-100 text-red-600">
                        {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'A'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user?.name || 'Admin User'}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user?.email || 'admin@example.com'}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault()
                      router.push('/profile')
                    }}
                    className="cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log('Settings clicked')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault()
                      console.log('Admin logout menu item clicked')
                      handleLogout()
                    }}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">SSO Provider Settings</h1>
          <p className="text-muted-foreground">Configure social sign-on providers for your application</p>
        </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Configure social sign-on providers for your application. Make sure to keep your client secrets secure.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {defaultProviders.map((defaultProvider) => {
          const existingProvider = providers.find(p => p.name === defaultProvider.name)
          const isEditing = editingProvider === existingProvider?.id
          const statusInfo = existingProvider ? getProviderStatus(existingProvider) : null

          return (
            <Card key={defaultProvider.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{defaultProvider.icon}</span>
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{defaultProvider.displayName}</span>
                        {statusInfo && (
                          <Badge 
                            variant="secondary" 
                            className={`${statusInfo.color} text-white`}
                          >
                            <statusInfo.icon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{defaultProvider.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {existingProvider && (
                      <Switch
                        checked={existingProvider.enabled}
                        onCheckedChange={(enabled) => {
                          const updatedProviders = providers.map(p => 
                            p.id === existingProvider.id ? { ...p, enabled } : p
                          )
                          setProviders(updatedProviders)
                          
                          // Auto-save enabled state
                          fetch('/api/admin/sso-providers', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              id: existingProvider.id,
                              enabled
                            })
                          })
                        }}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {!existingProvider ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      This provider hasn't been configured yet.
                    </p>
                    <Button 
                      onClick={() => handleCreate(defaultProvider.name)}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Setup {defaultProvider.displayName}
                    </Button>
                  </div>
                ) : isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientId">Client ID</Label>
                        <Input
                          id="clientId"
                          value={formData.clientId || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                          placeholder={`Enter ${defaultProvider.displayName} Client ID`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientSecret">Client Secret</Label>
                        <div className="relative">
                          <Input
                            id="clientSecret"
                            type={showSecrets[existingProvider.id] ? "text" : "password"}
                            value={formData.clientSecret || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
                            placeholder={`Enter ${defaultProvider.displayName} Client Secret`}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => toggleShowSecret(existingProvider.id)}
                          >
                            {showSecrets[existingProvider.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scopes">Scopes (JSON Array)</Label>
                      <Input
                        id="scopes"
                        value={formData.scopes || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, scopes: e.target.value }))}
                        placeholder='["openid", "email", "profile"]'
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Client ID</Label>
                        <p className="text-sm text-muted-foreground break-all">
                          {existingProvider.clientId || 'Not configured'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Client Secret</Label>
                        <p className="text-sm text-muted-foreground">
                          {existingProvider.clientSecret ? '••••••••••••••••' : 'Not configured'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={() => handleEdit(existingProvider)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Follow these steps to configure each OAuth provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="google" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="google">Google</TabsTrigger>
              <TabsTrigger value="facebook">Facebook</TabsTrigger>
              <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
            </TabsList>
            
            <TabsContent value="google" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Google OAuth Setup</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Go to <a href="https://console.cloud.google.com/" target="_blank" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                  <li>Create a new project or select existing one</li>
                  <li>Enable the Google+ API</li>
                  <li>Go to Credentials → Create Credentials → OAuth 2.0 Client IDs</li>
                  <li>Set authorized redirect URI: <code className="bg-muted px-1 rounded">{process.env.NEXTAUTH_URL}/api/auth/callback/google</code></li>
                  <li>Copy Client ID and Client Secret to the form above</li>
                </ol>
              </div>
            </TabsContent>
            
            <TabsContent value="facebook" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Facebook OAuth Setup</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Go to <a href="https://developers.facebook.com/" target="_blank" className="text-blue-600 hover:underline">Facebook for Developers</a></li>
                  <li>Create a new app</li>
                  <li>Add Facebook Login product</li>
                  <li>Set Valid OAuth Redirect URI: <code className="bg-muted px-1 rounded">{process.env.NEXTAUTH_URL}/api/auth/callback/facebook</code></li>
                  <li>Copy App ID and App Secret to the form above</li>
                </ol>
              </div>
            </TabsContent>
            
            <TabsContent value="linkedin" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">LinkedIn OAuth Setup</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Go to <a href="https://www.linkedin.com/developers/apps" target="_blank" className="text-blue-600 hover:underline">LinkedIn Developer Portal</a></li>
                  <li>Create a new app</li>
                  <li>Add Sign In with LinkedIn product</li>
                  <li>Set authorized redirect URL: <code className="bg-muted px-1 rounded">{process.env.NEXTAUTH_URL}/api/auth/callback/linkedin</code></li>
                  <li>Copy Client ID and Client Secret to the form above</li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}