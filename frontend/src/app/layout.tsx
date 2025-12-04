import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "CourseCompass - Data-Driven Learning Platform",
  description: "A comprehensive learning management system with advanced analytics for instructors and personalized learning experiences for students.",
  keywords: ["CourseCompass", "LMS", "e-learning", "online education", "analytics", "React", "Next.js"],
  authors: [{ name: "CourseCompass Team" }],
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
    title: "CourseCompass - Data-Driven Learning Platform",
    description: "Advanced learning management system with real-time analytics and personalized learning experiences.",
    url: "https://coursecompass.com",
    siteName: "CourseCompass",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CourseCompass - Data-Driven Learning Platform",
    description: "Advanced learning management system with real-time analytics.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
