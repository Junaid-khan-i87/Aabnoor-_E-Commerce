export const MAX_BODY_BYTES = 256 * 1024;

export const setSecurityHeaders = (res: any) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
};

export const isBodyTooLarge = (req: any): boolean => {
  const contentLength = parseInt(String(req.headers['content-length'] || '0'), 10);
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
};

export const rejectLargeBody = (req: any, res: any) => {
  if (!isBodyTooLarge(req)) return false;
  res.status(413).json({ error: 'Request body is too large.' });
  return true;
};
