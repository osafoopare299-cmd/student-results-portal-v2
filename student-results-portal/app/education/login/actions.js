'use server';

import { getEducationAuth } from '../../../lib/education-auth';

export async function signInEducationAccount(email, password) {
  const auth = getEducationAuth();
  if (!auth) return { ok: false, error: 'Education authentication is not configured yet.' };

  try {
    const result = await auth.signIn.email({ email, password });
    if (result?.error) {
      return { ok: false, error: result.error.message || 'Invalid email or password' };
    }
    return { ok: true };
  } catch (error) {
    console.error('Education sign-in failed:', error);
    return { ok: false, error: 'Unable to sign in. Please try again.' };
  }
}
