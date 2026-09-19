const DEFAULT_EDUCATION_AUTH_ORIGIN = 'https://dropare.site';

function canonicalEducationAuthOrigin() {
  const configured = process.env.EDUCATION_AUTH_TRUSTED_ORIGIN || DEFAULT_EDUCATION_AUTH_ORIGIN;

  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:') return DEFAULT_EDUCATION_AUTH_ORIGIN;
    return url.origin;
  } catch {
    return DEFAULT_EDUCATION_AUTH_ORIGIN;
  }
}

export function normalizeEducationAuthProxyRequest(request) {
  const requestUrl = new URL(request.url);
  const suppliedOrigin = request.headers.get('origin');

  if (!suppliedOrigin || process.env.VERCEL !== '1' || !requestUrl.hostname.endsWith('.vercel.app')) {
    return request;
  }

  let origin;
  try {
    origin = new URL(suppliedOrigin).origin;
  } catch {
    return request;
  }

  // Only normalize requests made by the preview page to its own auth proxy.
  // Cross-origin requests keep their original Origin and remain subject to
  // Neon Auth's normal CSRF/trusted-origin rejection.
  if (origin !== requestUrl.origin) return request;

  const canonicalOrigin = canonicalEducationAuthOrigin();
  if (origin === canonicalOrigin) return request;

  const headers = new Headers(request.headers);
  headers.set('origin', canonicalOrigin);
  console.info('[education-auth] Normalized same-origin Vercel preview request', {
    previewHost: requestUrl.hostname,
    canonicalOrigin,
  });

  return new Request(request, { headers });
}
