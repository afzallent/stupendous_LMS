import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  if (path.startsWith('/dashboard/trainer')) {
    // For now, allow access to trainer dashboard without authentication
    // We will re-implement Clerk authentication later.
    console.log('Skipping authentication for trainer dashboard (Clerk removed).');
  }

  return next();
});