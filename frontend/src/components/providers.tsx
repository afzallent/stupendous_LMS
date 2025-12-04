"use client"

import { SessionProvider } from "next-auth/react"
import { AuthProvider } from "@/lib/auth"
import { CartProvider } from "@/contexts/cart-context"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <AuthProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </AuthProvider>
    </SessionProvider>
  )
}