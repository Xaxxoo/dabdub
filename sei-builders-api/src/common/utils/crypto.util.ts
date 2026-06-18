import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../constants/app.constants';

const ALGORITHM = 'aes-256-cbc';

export function encrypt(text: string, key: string, iv: string): string {
  const keyBuffer = Buffer.from(key, 'utf8').subarray(0, 32);
  const ivBuffer = Buffer.from(iv, 'utf8').subarray(0, 16);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, ivBuffer);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return encrypted.toString('base64');
}

export function decrypt(encryptedText: string, key: string, iv: string): string {
  const keyBuffer = Buffer.from(key, 'utf8').subarray(0, 32);
  const ivBuffer = Buffer.from(iv, 'utf8').subarray(0, 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** SHA-256 hash a high-entropy token (refresh tokens, verification tokens).
 *  Synchronous — bcrypt is unnecessary for already-random tokens.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function compareToken(token: string, hash: string): boolean {
  const candidate = hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateSecureCode(length = 6): string {
  const digits = '0123456789';
  let code = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += digits[randomBytes[i] % digits.length];
  }
  return code;
}

export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
