import { createNeonAuth } from '@neondatabase/auth/next/server';

let instance;

export function educationAuthConfigured() {
  return Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);
}

export function getEducationAuth() {
  if (!educationAuthConfigured()) return null;
  if (!instance) {
    instance = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET,
        sameSite: 'lax',
      },
      logLevel: 'warn',
    });
  }
  return instance;
}
