"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Last updated: January 2026</p>
            
            <h2 className="text-xl font-semibold mt-6">1. Acceptance of Terms</h2>
            <p>By accessing and using this learning management system, you accept and agree to be bound by these Terms of Service.</p>
            
            <h2 className="text-xl font-semibold mt-6">2. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
            
            <h2 className="text-xl font-semibold mt-6">3. Course Content</h2>
            <p>All course content is provided for educational purposes. You may not redistribute, sell, or share course materials without permission.</p>
            
            <h2 className="text-xl font-semibold mt-6">4. User Conduct</h2>
            <p>You agree to use the platform responsibly and not engage in any activity that disrupts or interferes with the service.</p>
            
            <h2 className="text-xl font-semibold mt-6">5. Intellectual Property</h2>
            <p>All content, trademarks, and intellectual property on this platform are owned by their respective owners.</p>
            
            <h2 className="text-xl font-semibold mt-6">6. Limitation of Liability</h2>
            <p>We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
            
            <h2 className="text-xl font-semibold mt-6">7. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of updated terms.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
