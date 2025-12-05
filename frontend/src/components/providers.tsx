"use client"

import { AuthProvider } from "@/lib/auth"
import { CartProvider } from "@/contexts/cart-context"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  )
}