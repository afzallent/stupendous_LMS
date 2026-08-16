"use client"

/**
 * White-label branding.
 *
 * Single source of truth is the backend `SiteSettings` singleton, exposed at
 * `GET /api/settings/branding/`. The frontend falls back to
 * `NEXT_PUBLIC_BRAND_NAME` (or "Stupendous LMS") while loading or when the
 * backend is unreachable, so every branded surface renders without a flash
 * and a deployment can be rebranded from the Django admin alone.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { DEFAULT_BRAND, type Brand } from "@/lib/brand-config"

import { BookOpen } from "lucide-react"

const BrandContext = createContext<Brand>(DEFAULT_BRAND)

/** Server-side helper for `generateMetadata` — plain fetch, no context. */
export async function fetchBrand(): Promise<Brand> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  try {
    const res = await fetch(`${apiUrl}/api/settings/branding/`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return DEFAULT_BRAND
    const data = await res.json()
    return {
      name: data.site_name || DEFAULT_BRAND.name,
      tagline: data.tagline ?? null,
      logoUrl: data.logo_url ?? null,
      siteUrl: data.site_url ?? null,
    }
  } catch {
    return DEFAULT_BRAND
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    let cancelled = false
    fetch(`${apiUrl}/api/settings/branding/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setBrand({
            name: data.site_name || DEFAULT_BRAND.name,
            tagline: data.tagline ?? null,
            logoUrl: data.logo_url ?? null,
            siteUrl: data.site_url ?? null,
          })
        }
      })
      .catch(() => {
        /* keep fallback brand */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}

export function useBrand(): Brand {
  return useContext(BrandContext)
}

/** Logo image when the backend has one uploaded, neutral icon otherwise. */
export function BrandLogo({ className = "h-8 w-8" }: { className?: string }) {
  const { logoUrl } = useBrand()
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-uploaded origin
    return <img src={logoUrl} alt="Logo" className={className} />
  }
  return <BookOpen className={`${className} text-primary`} />
}

/**
 * Brand wordmark: logo + name. `textClassName` styles the name span so each
 * surface keeps its existing look (gradient text, sizes, dark/light).
 */
export function BrandMark({
  textClassName = "text-2xl font-bold",
  logoClassName = "h-8 w-8",
  href = "/",
}: {
  textClassName?: string
  logoClassName?: string
  href?: string | null
}) {
  const { name } = useBrand()
  const mark = (
    <>
      <BrandLogo className={logoClassName} />
      <span className={textClassName}>{name}</span>
    </>
  )
  const layout = "flex items-center space-x-2"
  if (href === null) return <span className={layout}>{mark}</span>
  return <Link href={href} className={layout}>{mark}</Link>
}

/** `© {year} {brand}. All rights reserved.` */
export function BrandCopyright() {
  const { name } = useBrand()
  return <>© {new Date().getFullYear()} {name}. All rights reserved.</>
}
