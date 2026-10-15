import { createHmac } from 'crypto';

export function createAuthTag(passwordHash: string, secret: string) {
  return createHmac('sha256', secret).update(passwordHash).digest('hex');
}
