export interface Brand {
  name: string
  tagline: string | null
  logoUrl: string | null
  siteUrl: string | null
}

/**
 * Fallback brand while the backend is unreachable or before its response
 * arrives. NEXT_PUBLIC_BRAND_NAME lets a deployment pin the fallback without
 * touching the backend.
 */
export const DEFAULT_BRAND: Brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "Stupendous LMS",
  tagline: null,
  logoUrl: null,
  siteUrl: null,
}

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
