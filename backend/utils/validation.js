import { z } from 'zod';

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i, /^127\./, /^0\.0\.0\.0$/,
  /^10\./, /^169\.254\./, /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./, /\.local$/i, /\.internal$/i
];

export const destinationUrlSchema = z.string().url().superRefine((u, ctx) => {
  let parsed;
  try { parsed = new URL(u); } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid URL' }); return;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    ctx.addIssue({ code: 'custom', message: 'Only http/https URLs allowed' }); return;
  }
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOST_PATTERNS.some(rx => rx.test(host))) {
    ctx.addIssue({ code: 'custom', message: 'URL host is not allowed' });
  }
});

export const flowPageCountSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);