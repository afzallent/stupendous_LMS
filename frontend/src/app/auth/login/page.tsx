"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { 
  BookOpen, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Loader2,
  Chrome,
  Linkedin
} from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

const providerIcons: { [key: string]: any } = {
  google: Chrome,
  facebook: Chrome,
  linkedin: Linkedin
}

const providerStyles: { [key: string]: string } = {
  google: "bg-red-500 hover:bg-red-600 text-white",
  facebook: "bg-blue-600 hover:bg-blue-700 text-white", 
  linkedin: "bg-blue-700 hover:bg-blue-800 text-white"
}

function AuthPageContent() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<any>({})
  const [activeTab, setActiveTab] = useState("login")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [redirectPath, setRedirectPath] = useState<string>('/')
  
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  })
  
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false
  })

  useEffect(() => {
    // Get redirect path from URL params
    const redirect = searchParams.get('redirect')
    if (redirect) {
      setRedirectPath(decodeURIComponent(redirect))
      console.log('📍 Redirect path set to:', decodeURIComponent(redirect))
    }
    
    const loadProviders = async () => {
      try {
        // Load SSO providers from our API instead of NextAuth
        const response = await fetch('/api/admin/sso-providers')
        if (response.ok) {
          const data = await response.json()
          const enabledProviders = data.providers?.filter((p: any) => p.enabled && p.clientId && p.clientSecret) || []
          const providersMap = Object.fromEntries(
            enabledProviders.map((p: any) => [p.name, { id: p.name, name: p.displayName }])
          )
          setProviders(providersMap)
        }
      } catch (error) {
        console.error('Failed to load providers:', error)
      }
    }
    
    loadProviders()
  }, [searchParams])

  const handleSocialSignIn = async (providerId: string) => {
    try {
      setLoading(true)
      // Include redirect path in the SSO callback URL
      const callbackUrl = redirectPath !== '/' ? `${redirectPath}` : '/'
      // Redirect to NextAuth sign-in with provider
      window.location.href = `/api/auth/signin/${providerId}?callbackUrl=${encodeURIComponent(callbackUrl)}`
    } catch (error) {
      console.error('Social sign-in error:', error)
      toast({
        title: "Authentication Failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  const { login, user } = useAuth()

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)
      const success = await login(loginForm.email, loginForm.password)
      
      if (success) {
        toast({
          title: "Login Successful",
          description: "Welcome back!"
        })
        
        // Wait a moment for user state to update
        setTimeout(() => {
          // Use redirect path if provided, otherwise redirect based on user role
          let targetPath = redirectPath
          
          // Override redirect path based on user role if coming from root
          if (redirectPath === '/' || !redirectPath) {
            const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}')
            switch (currentUser?.role) {
              case 'ADMIN':
                targetPath = '/admin'
                break
              case 'TRAINER':
                targetPath = '/instructor'
                break
              case 'STUDENT':
              default:
                targetPath = '/learn'
                break
            }
          }
          
          console.log('🎯 Redirecting to:', targetPath)
          router.push(targetPath)
        }, 100)
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Login error:', error)
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!signupForm.name || !signupForm.email || !signupForm.password || !signupForm.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive"
      })
      return
    }
    
    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: "Validation Error", 
        description: "Passwords do not match",
        variant: "destructive"
      })
      return
    }
    
    if (!signupForm.agreeToTerms) {
      toast({
        title: "Validation Error",
        description: "You must agree to the terms and conditions",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupForm.name,
          email: signupForm.email,
          password: signupForm.password,
          confirmPassword: signupForm.confirmPassword,
          agreeToTerms: signupForm.agreeToTerms
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Account Created",
          description: "Welcome to CourseCompass! Please sign in."
        })
        
        setActiveTab('login')
        setLoginForm(prev => ({ ...prev, email: signupForm.email }))
        setSignupForm({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          agreeToTerms: false
        })
      } else {
        toast({
          title: "Signup Failed",
          description: data.error || "Failed to create account",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Signup error:', error)
      toast({
        title: "Signup Failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CourseCompass
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Continue your learning journey with us
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-0 shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Sign in to your account</CardTitle>
                <CardDescription>
                  Enter your credentials to access your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.keys(providers).length > 0 && (
                  <>
                    <div className="space-y-3">
                      {Object.values(providers).map((provider: any) => {
                        const Icon = providerIcons[provider.id] || Chrome
                        const style = providerStyles[provider.id] || "bg-gray-600 hover:bg-gray-700 text-white"
                        
                        return (
                          <Button
                            key={provider.id}
                            variant="outline"
                            onClick={() => handleSocialSignIn(provider.id)}
                            disabled={loading}
                            className={`w-full h-12 ${style} border-0 shadow-md hover:shadow-lg transition-all duration-200`}
                          >
                            {loading ? (
                              <Loader2 className="h-5 w-5 animate-spin mr-3" />
                            ) : (
                              <Icon className="h-5 w-5 mr-3" />
                            )}
                            Continue with {provider.name}
                          </Button>
                        )
                      })}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-background px-4 text-muted-foreground">
                          Or continue with email
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <form onSubmit={handleCredentialsSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="pl-10 pr-12 h-12"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" />
                      <Label htmlFor="remember" className="text-sm">Remember me</Label>
                    </div>
                    <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Create your account</CardTitle>
                <CardDescription>
                  Join CourseCompass and start your learning journey
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.keys(providers).length > 0 && (
                  <>
                    <div className="space-y-3">
                      {Object.values(providers).map((provider: any) => {
                        const Icon = providerIcons[provider.id] || Chrome
                        const style = providerStyles[provider.id] || "bg-gray-600 hover:bg-gray-700 text-white"
                        
                        return (
                          <Button
                            key={provider.id}
                            variant="outline"
                            onClick={() => handleSocialSignIn(provider.id)}
                            disabled={loading}
                            className={`w-full h-12 ${style} border-0 shadow-md hover:shadow-lg transition-all duration-200`}
                          >
                            {loading ? (
                              <Loader2 className="h-5 w-5 animate-spin mr-3" />
                            ) : (
                              <Icon className="h-5 w-5 mr-3" />
                            )}
                            Sign up with {provider.name}
                          </Button>
                        )
                      })}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-background px-4 text-muted-foreground">
                          Or create account with email
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={signupForm.name}
                        onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        className="pl-10 pr-12 h-12"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={signupForm.confirmPassword}
                        onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={signupForm.agreeToTerms}
                      onCheckedChange={(checked) => setSignupForm({ ...signupForm, agreeToTerms: checked as boolean })}
                    />
                    <Label htmlFor="terms" className="text-sm leading-relaxed">
                      I agree to the{" "}
                      <Link href="/terms" className="text-blue-600 hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-blue-600 hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200" 
                    disabled={!signupForm.agreeToTerms || loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p className="leading-relaxed">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <AuthPageContent />
    </Suspense>
  )
}
