import { createHash, randomBytes } from 'node:crypto';

export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function digestToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function publicAppUrl(path: string, token: string): string {
  const configured = process.env.NEXTAUTH_URL;
  if (!configured) throw new Error('NEXTAUTH_URL is not configured');
  const url = new URL(path, configured);
  url.searchParams.set('token', token);
  return url.toString();
}

