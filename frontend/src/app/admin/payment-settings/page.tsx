"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  CreditCard,
  LogOut,
  User,
  TestTube
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface PaymentGateway {
  id: string
  name: string
  displayName: string
  type: 'stripe' | 'razorpay' | 'paypal'
  publishableKey?: string
  secretKey: string
  webhookSecret?: string
  enabled: boolean
  testMode: boolean
  configuration?: Record<string, any>
}

const defaultGateways = [
  {
    name: "stripe",
    displayName: "Stripe",
    icon: "💳",
    description: "Accept credit cards and international payments",
    fields: [
      { key: "publishableKey", label: "Publishable Key", required: true, secret: false },
      { key: "secretKey", label: "Secret Key", required: true, secret: true },
      { key: "webhookSecret", label: "Webhook Secret", required: false, secret: true }
    ]
  },
  {
    name: "razorpay",
    displayName: "Razorpay",
    icon: "🇮🇳",
    description: "Indian payment gateway for UPI, cards, and net banking",
    fields: [
      { key: "keyId", label: "Key ID", required: true, secret: false },
      { key: "keySecret", label: "Key Secret", required: true, secret: true },
      { key: "webhookSecret", label: "Webhook Secret", required: false, secret: true }
    ]
  }
]

export default function PaymentSettingsPage() {
  const router = useRouter()
  const [gateways, setGateways] = useState<PaymentGateway[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [editingGateway, setEditingGateway] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<PaymentGateway & Record<string, any>>>({})
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    loadGateways()
  }, [])

  const handleLogout = async () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    window.location.href = '/'
  }

  const loadGateways = async () => {
    try {
      const response = await fetch('/api/admin/payment-gateways', {
        headers: {
          'x-user-role': 'ADMIN'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setGateways(data.gateways || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load payment gateways",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to load gateways:', error)
      toast({
        title: "Error",
        description: "Failed to load payment gateways",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (gateway: PaymentGateway) => {
    setEditingGateway(gateway.id)
    setFormData(gateway)
  }

  const handleSave = async () => {
    if (!editingGateway || !formData) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/admin/payment-gateways', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'ADMIN'
        },
        body: JSON.stringify({
          id: editingGateway,
          ...formData
        })
      })

      if (response.ok) {
        await loadGateways()
        setEditingGateway(null)
        setFormData({})
        toast({
          title: "Success",
          description: "Payment gateway updated successfully"
        })
      } else {
        throw new Error('Failed to update gateway')
      }
    } catch (error) {
      console.error('Failed to save gateway:', error)
      toast({
        title: "Error",
        description: "Failed to update payment gateway",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async (gatewayName: string) => {
    const defaultGateway = defaultGateways.find(g => g.name === gatewayName)
    if (!defaultGateway) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/payment-gateways', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'ADMIN'
        },
        body: JSON.stringify({
          name: gatewayName,
          displayName: defaultGateway.displayName,
          type: gatewayName,
          enabled: false,
          testMode: true
        })
      })

      if (response.ok) {
        await loadGateways()
        toast({
          title: "Success",
          description: `${defaultGateway.displayName} gateway created successfully`
        })
      } else {
        throw new Error('Failed to create gateway')
      }
    } catch (error) {
      console.error('Failed to create gateway:', error)
      toast({
        title: "Error",
        description: "Failed to create payment gateway",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleGatewayEnabled = async (gatewayId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/payment-gateways', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'ADMIN'
        },
        body: JSON.stringify({
          id: gatewayId,
          enabled
        })
      })

      if (response.ok) {
        await loadGateways()
        toast({
          title: "Success",
          description: `Payment gateway ${enabled ? 'enabled' : 'disabled'} successfully`
        })
      } else {
        throw new Error('Failed to update gateway')
      }
    } catch (error) {
      console.error('Failed to toggle gateway:', error)
      toast({
        title: "Error",
        description: "Failed to update payment gateway",
        variant: "destructive"
      })
    }
  }

  const testConnection = async (gatewayId: string) => {
    try {
      const response = await fetch('/api/admin/payment-gateways/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'ADMIN'
        },
        body: JSON.stringify({ id: gatewayId })
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        toast({
          title: "Connection Successful",
          description: "Payment gateway connection test passed"
        })
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Payment gateway connection test failed",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to test connection:', error)
      toast({
        title: "Error",
        description: "Failed to test payment gateway connection",
        variant: "destructive"
      })
    }
  }

  const toggleShowSecret = (gatewayId: string, field: string) => {
    const key = `${gatewayId}-${field}`
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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
                  <a href="/admin/sso-settings" className="text-sm font-medium hover:text-primary">SSO Settings</a>
                  <a href="/admin/payment-settings" className="text-sm font-medium text-primary">Payment Settings</a>
                </nav>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarFallback className="bg-red-100 text-red-600">A</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
      {/* Header - Same as SSO settings page */}
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
                <a href="/admin/sso-settings" className="text-sm font-medium hover:text-primary flex items-center">
                  <Settings className="h-4 w-4 mr-1" />
                  SSO Settings
                </a>
                <a href="/admin/payment-settings" className="text-sm font-medium text-primary flex items-center">
                  <CreditCard className="h-4 w-4 mr-1" />
                  Payment Settings
                </a>
              </nav>
            </div>
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
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user?.name || 'Admin User'}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user?.email || 'admin@example.com'}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Payment Gateway Settings</h1>
          <p className="text-muted-foreground">Configure payment gateways for processing transactions</p>
        </div>

        <Alert className="mb-6">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Configure your payment gateways securely. All credentials are encrypted and stored safely.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6">
          {defaultGateways.map((defaultGateway) => {
            const existingGateway = gateways.find(g => g.name === defaultGateway.name)
            const isEditing = editingGateway === existingGateway?.id

            return (
              <Card key={defaultGateway.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{defaultGateway.icon}</span>
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{defaultGateway.displayName}</span>
                          {existingGateway && (
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Configured
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{defaultGateway.description}</CardDescription>
                      </div>
                    </div>
                    {existingGateway && (
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={existingGateway.enabled}
                          onCheckedChange={(enabled) => toggleGatewayEnabled(existingGateway.id, enabled)}
                        />
                        <Label>Enabled</Label>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  {!existingGateway ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-4">
                        This payment gateway hasn't been configured yet.
                      </p>
                      <Button 
                        onClick={() => handleCreate(defaultGateway.name)}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Setup {defaultGateway.displayName}
                      </Button>
                    </div>
                  ) : isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {defaultGateway.fields.map((field) => (
                          <div key={field.key} className="space-y-2">
                            <Label htmlFor={field.key}>
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <div className="relative">
                              <Input
                                id={field.key}
                                type={field.secret && !showSecrets[`${existingGateway.id}-${field.key}`] ? "password" : "text"}
                                value={formData[field.key] || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                placeholder={`Enter ${field.label}`}
                                className={field.secret ? "pr-10" : ""}
                              />
                              {field.secret && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => toggleShowSecret(existingGateway.id, field.key)}
                                >
                                  {showSecrets[`${existingGateway.id}-${field.key}`] ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center space-x-2">
                          <Switch
                            checked={formData.testMode || false}
                            onCheckedChange={(testMode) => setFormData(prev => ({ ...prev, testMode }))}
                          />
                          <span>Test Mode</span>
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Enable test mode for development and testing
                        </p>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setEditingGateway(null)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {defaultGateway.fields.map((field) => (
                          <div key={field.key}>
                            <Label className="text-sm font-medium">{field.label}</Label>
                            <p className="text-sm text-muted-foreground">
                              {field.secret ? '••••••••••••••••' : (existingGateway[field.key as keyof PaymentGateway] || 'Not configured')}
                            </p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => testConnection(existingGateway.id)}
                        >
                          <TestTube className="h-4 w-4 mr-2" />
                          Test Connection
                        </Button>
                        <Button variant="outline" onClick={() => handleEdit(existingGateway)}>
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

        {/* Quick Setup Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Stripe Setup</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to <a href="https://dashboard.stripe.com/" target="_blank" className="text-blue-600 hover:underline">Stripe Dashboard</a></li>
                <li>Get API keys from Developers → API keys</li>
                <li>Setup webhooks at Developers → Webhooks</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-2">Razorpay Setup</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to <a href="https://dashboard.razorpay.com/" target="_blank" className="text-blue-600 hover:underline">Razorpay Dashboard</a></li>
                <li>Get API keys from Settings → API Keys</li>
                <li>Setup webhooks at Settings → Webhooks</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}