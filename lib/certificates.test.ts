import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RegistrationStatus } from "@prisma/client";
import {
  formatCertificateDate,
  isCertificatesEnabled,
  isWorkshopEndDueForCertificates,
  registrationEligibleForCertificate,
  workshopEndsAt,
} from "./certificates";

describe("isCertificatesEnabled", () => {
  it("is off unless CERTIFICATES_ENABLED=true", () => {
    const prev = process.env.CERTIFICATES_ENABLED;
    delete process.env.CERTIFICATES_ENABLED;
    assert.equal(isCertificatesEnabled(), false);
    process.env.CERTIFICATES_ENABLED = "true";
    assert.equal(isCertificatesEnabled(), true);
    if (prev === undefined) delete process.env.CERTIFICATES_ENABLED;
    else process.env.CERTIFICATES_ENABLED = prev;
  });
});

describe("registrationEligibleForCertificate", () => {
  it("requires confirmed status and at least one check-in", () => {
    assert.equal(
      registrationEligibleForCertificate({
        status: RegistrationStatus.CONFIRMED,
        checkins: [{}],
      }),
      true
    );
    assert.equal(
      registrationEligibleForCertificate({
        status: RegistrationStatus.CONFIRMED,
        checkins: [],
      }),
      false
    );
    assert.equal(
      registrationEligibleForCertificate({
        status: RegistrationStatus.CANCELLED,
        checkins: [{}],
      }),
      false
    );
  });
});

describe("formatCertificateDate", () => {
  it("formats date as Mes/dd/yyyy in Spanish", () => {
    const label = formatCertificateDate(new Date("2026-05-27T18:00:00.000Z"));
    assert.match(label, /^Mayo\/\d{2}\/2026$/);
  });
});

describe("workshopEndsAt", () => {
  it("adds default 8 hours to start time", () => {
    const startsAt = new Date("2026-05-27T14:00:00.000Z");
    const endsAt = workshopEndsAt(startsAt);
    assert.equal(endsAt.getTime() - startsAt.getTime(), 8 * 60 * 60 * 1000);
  });
});

describe("isWorkshopEndDueForCertificates", () => {
  it("includes workshops that ended within the daily window", () => {
    const startsAt = new Date("2026-05-27T10:00:00.000Z");
    const now = new Date("2026-05-27T20:00:00.000Z");
    assert.equal(isWorkshopEndDueForCertificates(startsAt, now), true);
  });

  it("excludes workshops that have not ended yet", () => {
    const startsAt = new Date("2026-05-27T14:00:00.000Z");
    const now = new Date("2026-05-27T18:00:00.000Z");
    assert.equal(isWorkshopEndDueForCertificates(startsAt, now), false);
  });

  it("excludes workshops that ended before the window", () => {
    const startsAt = new Date("2026-05-20T10:00:00.000Z");
    const now = new Date("2026-05-27T20:00:00.000Z");
    assert.equal(
      isWorkshopEndDueForCertificates(startsAt, now, { windowMs: 25 * 60 * 60 * 1000 }),
      false
    );
  });
});
