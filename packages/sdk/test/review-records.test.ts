import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parityMet, parityOf, type ReviewRecord } from "../../../benchmarks/review-records.mts";

/**
 * T04 — reference parity must be a decision procedure, not a constant.
 *
 * The benchmark used to write the same "NOT MET" string for every case and set a failing
 * exit code unconditionally. That is honest about the present state, but recording a real
 * human approval could not change it and a regression could not be detected by it. These
 * assert the two properties that make the record mechanism worth having: a valid record
 * changes the status, and a stale one does not.
 */

const REFERENCE = "a".repeat(64);
const CANDIDATE = "b".repeat(64);

function record(overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    case: "ref-01-event-flow",
    verdict: "approved",
    reviewer: "A Reviewer",
    date: "2026-09-20",
    referenceSha256: REFERENCE,
    candidateSha256: CANDIDATE,
    ...overrides,
  };
}

describe("reference parity from review records", () => {
  it("is unreviewed when no record exists", () => {
    const parity = parityOf("ref-01-event-flow", REFERENCE, CANDIDATE, []);
    expect(parity.status).toBe("unreviewed");
    expect(parityMet(parity.status)).toBe(false);
  });

  it("is unreviewable when the reference image is not in this checkout", () => {
    // A missing private screenshot must never read as approval, and must be distinct from
    // "a human looked and said no".
    const parity = parityOf("ref-01-event-flow", null, CANDIDATE, [record()]);
    expect(parity.status).toBe("unreviewable");
    expect(parityMet(parity.status)).toBe(false);
  });

  it("is approved when a valid record covers exactly these artifacts", () => {
    const parity = parityOf("ref-01-event-flow", REFERENCE, CANDIDATE, [record()]);
    expect(parity.status).toBe("approved");
    expect(parityMet(parity.status)).toBe(true);
    // The reviewer and date are carried through, so an approval is always attributable.
    expect(parity.detail).toContain("A Reviewer");
    expect(parity.detail).toContain("2026-09-20");
  });

  it("carries a rejection through as a rejection, not as unreviewed", () => {
    const parity = parityOf("ref-01-event-flow", REFERENCE, CANDIDATE, [record({ verdict: "rejected", notes: "regions not equivalent" })]);
    expect(parity.status).toBe("rejected");
    expect(parityMet(parity.status)).toBe(false);
    expect(parity.detail).toContain("regions not equivalent");
  });

  it("goes stale when the candidate changes", () => {
    // A regenerated candidate is a different picture. An approval of the old one says
    // nothing about it, so it must not be carried forward.
    const parity = parityOf("ref-01-event-flow", REFERENCE, "c".repeat(64), [record()]);
    expect(parity.status).toBe("stale");
    expect(parityMet(parity.status)).toBe(false);
    expect(parity.detail).toContain("changed since it was reviewed");
  });

  it("goes stale when the reference image changes", () => {
    const parity = parityOf("ref-01-event-flow", "d".repeat(64), CANDIDATE, [record()]);
    expect(parity.status).toBe("stale");
    expect(parityMet(parity.status)).toBe(false);
  });

  it("does not let one case's record approve another", () => {
    const parity = parityOf("ref-02-repeated-clusters", REFERENCE, CANDIDATE, [record()]);
    expect(parity.status).toBe("unreviewed");
  });

  it("treats only `approved` as parity met", () => {
    for (const status of ["rejected", "stale", "unreviewed", "unreviewable"] as const) {
      expect(parityMet(status), status).toBe(false);
    }
    expect(parityMet("approved")).toBe(true);
  });
});

describe("the committed review record set", () => {
  it("contains no approvals, because none have been obtained", async () => {
    // This repository must never carry a fabricated human approval. If a real review is
    // ever recorded, this expectation is the place to update deliberately, by a person.
    const path = fileURLToPath(new URL("../../../benchmarks/reference-reviews.json", import.meta.url));
    const parsed = JSON.parse(await readFile(path, "utf8")) as { records: ReviewRecord[] };
    expect(parsed.records).toEqual([]);
  });
});
