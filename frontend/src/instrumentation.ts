/**
 * Next.js instrumentation hook — server-side error reporting.
 *
 * Entirely optional: with no NEXT_PUBLIC_SENTRY_DSN set, register() does
 * nothing and onRequestError only logs, so local development and CI never
 * phone home.
 *
 * Sentry is imported dynamically so the package is not a hard dependency of
 * the build. If it is not installed, reporting degrades to console logging.
 */
import type { Instrumentation } from 'next'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

export async function register() {
  if (!SENTRY_DSN) return

  // Only initialise in the Node.js runtime; the edge runtime needs its own
  // Sentry entry point and this app has no edge routes.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  try {
    const Sentry = await import('@sentry/nextjs')
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'production',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      // Never ship request bodies or headers: they carry JWTs.
      sendDefaultPii: false,
    })
  } catch {
    // @sentry/nextjs not installed — reporting stays disabled.
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  if (!SENTRY_DSN) {
    console.error('[server error]', request.path, err)
    return
  }

  try {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureRequestError(err, request, context)
  } catch {
    console.error('[server error]', request.path, err)
  }
}
