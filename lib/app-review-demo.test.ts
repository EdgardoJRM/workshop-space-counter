import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  isAppReviewDemoEnabled,
  verifyAppReviewDemoCredentials,
} from "./app-review-demo";

const ORIGINAL_EMAIL = process.env.APP_REVIEW_DEMO_EMAIL;
const ORIGINAL_PASSWORD = process.env.APP_REVIEW_DEMO_PASSWORD;

afterEach(() => {
  if (ORIGINAL_EMAIL === undefined) {
    delete process.env.APP_REVIEW_DEMO_EMAIL;
  } else {
    process.env.APP_REVIEW_DEMO_EMAIL = ORIGINAL_EMAIL;
  }
  if (ORIGINAL_PASSWORD === undefined) {
    delete process.env.APP_REVIEW_DEMO_PASSWORD;
  } else {
    process.env.APP_REVIEW_DEMO_PASSWORD = ORIGINAL_PASSWORD;
  }
});

describe("app-review-demo", () => {
  it("is disabled when env vars are missing", () => {
    delete process.env.APP_REVIEW_DEMO_EMAIL;
    delete process.env.APP_REVIEW_DEMO_PASSWORD;
    assert.equal(isAppReviewDemoEnabled(), false);
  });

  it("is enabled when env vars are set", () => {
    process.env.APP_REVIEW_DEMO_EMAIL = "review@example.com";
    process.env.APP_REVIEW_DEMO_PASSWORD = "secret-pass";
    assert.equal(isAppReviewDemoEnabled(), true);
  });

  it("accepts matching credentials case-insensitively for email", () => {
    process.env.APP_REVIEW_DEMO_EMAIL = "review@example.com";
    process.env.APP_REVIEW_DEMO_PASSWORD = "secret-pass";
    assert.equal(
      verifyAppReviewDemoCredentials("Review@Example.com", "secret-pass"),
      true
    );
  });

  it("rejects wrong password", () => {
    process.env.APP_REVIEW_DEMO_EMAIL = "review@example.com";
    process.env.APP_REVIEW_DEMO_PASSWORD = "secret-pass";
    assert.equal(
      verifyAppReviewDemoCredentials("review@example.com", "wrong"),
      false
    );
  });
});
