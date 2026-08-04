// Password hashing — bcrypt. Never store or log plaintext passwords or
// hashes; hashPassword/verifyPassword are the only places that should ever
// touch a raw password string.
import bcrypt from "bcrypt";

// 12 rounds: standard, deliberate balance of brute-force resistance vs.
// request latency for a project at this scale.
const SALT_ROUNDS = 12;

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
