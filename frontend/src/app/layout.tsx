import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { fetchBrand } from "@/lib/brand-config";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap", // Optimize font loading
});

export async function generateMetadata(): Promise<Metadata> {
  // Brand name comes from the backend SiteSettings (white-label); falls back
  // to NEXT_PUBLIC_BRAND_NAME / "Stupendous LMS" when the API is unreachable.
  const brand = await fetchBrand();
  const title = `${brand.name} - Data-Driven Learning Platform`;
  const description =
    "A comprehensive learning management system with advanced analytics for instructors and personalized learning experiences for students.";
  return {
    title,
    description,
    keywords: [brand.name, "LMS", "e-learning", "online education", "analytics"],
    authors: [{ name: brand.name }],
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico', sizes: '32x32' },
      ],
      apple: [
        { url: '/favicon.svg', sizes: '180x180', type: 'image/svg+xml' },
      ],
    },
    openGraph: {
      title,
      description: "Advanced learning management system with real-time analytics and personalized learning experiences.",
      url: brand.siteUrl ?? undefined,
      siteName: brand.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "Advanced learning management system with real-time analytics.",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const apiDomain = new URL(apiUrl).hostname;
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to API server for faster data fetching */}
        <link rel="preconnect" href={apiUrl} />
        <link rel="dns-prefetch" href={apiUrl} />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
