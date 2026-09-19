import { getVercelOidcToken } from '@vercel/oidc';

/**
 * Resolve an AI Gateway credential for the current request.
 *
 * Vercel may expose OIDC through the request context instead of a plain
 * process environment variable, so reading process.env.VERCEL_OIDC_TOKEN
 * alone incorrectly reports AI as disabled on otherwise configured projects.
 */
export async function getEducationGatewayToken() {
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY;
  if (apiKey) return apiKey;

  try {
    return await getVercelOidcToken();
  } catch (error) {
    console.warn('Education AI Gateway authentication is unavailable:', error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}
