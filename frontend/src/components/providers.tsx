"use client"

import { AuthProvider } from "@/lib/auth"
import { CartProvider } from "@/contexts/cart-context"
import { BrandingProvider } from "@/lib/branding"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <BrandingProvider>
      <AuthProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </AuthProvider>
    </BrandingProvider>
  )
}