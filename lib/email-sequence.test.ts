import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatEmailDelayLabel,
  normalizeEmailTemplateAnchor,
} from "./email-sequence";

describe("normalizeEmailTemplateAnchor", () => {
  it("defaults to event_start", () => {
    assert.equal(normalizeEmailTemplateAnchor(undefined), "event_start");
    assert.equal(normalizeEmailTemplateAnchor("event_start"), "event_start");
  });

  it("accepts checkin", () => {
    assert.equal(normalizeEmailTemplateAnchor("checkin"), "checkin");
    assert.equal(normalizeEmailTemplateAnchor("CHECKIN"), "checkin");
  });
});

describe("formatEmailDelayLabel", () => {
  it("describes check-in immediate send", () => {
    assert.equal(formatEmailDelayLabel(0, "checkin"), "Al momento del check-in");
  });

  it("describes delayed check-in send", () => {
    assert.equal(formatEmailDelayLabel(24, "checkin"), "1 día después del check-in");
  });

  it("describes event start timing", () => {
    assert.equal(formatEmailDelayLabel(2, "event_start"), "2h después del inicio del evento");
  });
});
