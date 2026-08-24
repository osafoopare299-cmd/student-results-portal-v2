import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'results_admin';
const MAX_AGE = 60 * 60 * 8;

function secret() {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) throw new Error('ADMIN_PASSWORD is not configured');
  return value;
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

export function createAdminToken() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `admin:${exp}`;
  return `${payload}:${sign(payload)}`;
}

export function verifyAdminToken(token) {
  if (!token) return false;
  const [role, exp, sig] = token.split(':');
  if (!role || !exp || !sig || role !== 'admin') return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(`${role}:${exp}`);
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); }
  catch { return false; }
}

export async function isAdmin() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return false;
  const [role, exp, sig] = token.split(':');
  if (!role || !exp || !sig || role !== 'admin') return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(`${role}:${exp}`);
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); }
  catch { return false; }
}

export const adminCookie = { name: COOKIE, maxAge: MAX_AGE };
