import { timingSafeEqual } from "crypto";

export function isAppReviewDemoEnabled(): boolean {
  const email = process.env.APP_REVIEW_DEMO_EMAIL?.trim();
  const password = process.env.APP_REVIEW_DEMO_PASSWORD?.trim();
  return Boolean(email && password);
}

function safeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function verifyAppReviewDemoCredentials(
  email: string,
  password: string
): boolean {
  const expectedEmail = process.env.APP_REVIEW_DEMO_EMAIL?.trim().toLowerCase();
  const expectedPassword = process.env.APP_REVIEW_DEMO_PASSWORD?.trim();
  if (!expectedEmail || !expectedPassword) return false;

  const normalizedEmail = email.trim().toLowerCase();
  if (!safeEqual(normalizedEmail, expectedEmail)) return false;
  return safeEqual(password, expectedPassword);
}
