import { SignJWT, jwtVerify } from 'jose';
import { getJwtSecret } from './secret';

export const COMM_FLAG_COOKIE = 'cc_comm_req';
export const COMM_FLAG_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Signed token stored in the cookie so clients cannot forge it.
export async function signCommFlag(required: boolean): Promise<string> {
  return await new SignJWT({ required })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

// Fails closed: missing, expired, or forged cookies mean "required".
export async function readCommFlag(token?: string): Promise<boolean> {
  if (!token) return true;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload.required !== false;
  } catch {
    return true;
  }
}
