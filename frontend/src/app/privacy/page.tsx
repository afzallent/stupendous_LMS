"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function PrivacyPage() {
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
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Last updated: January 2026</p>
            
            <h2 className="text-xl font-semibold mt-6">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as when you create an account, enroll in courses, or contact us for support.</p>
            
            <h2 className="text-xl font-semibold mt-6">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.</p>
            
            <h2 className="text-xl font-semibold mt-6">3. Information Sharing</h2>
            <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.</p>
            
            <h2 className="text-xl font-semibold mt-6">4. Data Security</h2>
            <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
            
            <h2 className="text-xl font-semibold mt-6">5. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
