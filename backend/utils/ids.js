import crypto from 'crypto';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateShortCode(len = 7) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function newJourneyToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashIp(ip, secret) {
  return crypto.createHmac('sha256', secret).update(String(ip || '')).digest('hex');
}

// Low-entropy visitor fingerprint — best-effort cooldown key. NOT tracking-grade.
export function hashVisitor(req, secret) {
  const ip = req.ip || req.socket?.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  const lang = req.headers['accept-language'] || '';
  return crypto.createHmac('sha256', secret).update(`${ip}|${ua}|${lang}`).digest('hex');
}

export function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}