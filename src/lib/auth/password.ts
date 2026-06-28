import "server-only";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const ITERATIONS = 120_000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");

  return {
    hash,
    salt,
  };
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  const left = Buffer.from(hash, "hex");
  const right = Buffer.from(expectedHash, "hex");

  return left.length === right.length && timingSafeEqual(left, right);
}
