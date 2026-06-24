import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/** Захешировать пароль для хранения */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Сверить пароль с хешем */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
