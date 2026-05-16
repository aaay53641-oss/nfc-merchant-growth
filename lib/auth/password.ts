import { createHash } from "node:crypto";

const SALT = "nfc-merchant-salt";

function sha256(input: string): string {
  return createHash("sha256").update(`${input}:${SALT}`).digest("hex");
}

export async function hashPassword(plain: string): Promise<string> {
  return sha256(plain);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return sha256(plain) === hashed;
}
