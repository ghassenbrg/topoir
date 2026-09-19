import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

/**
 * Human visual review records, bound to the exact bytes they were made against.
 *
 * The reference benchmark used to write the literal string
 * `"NOT MET — documented gaps; human review required"` for every case and then set
 * `process.exitCode = 1` unconditionally under `--require-parity`. That is honest about
 * the current state but it is not a *decision procedure*: recording a real human approval
 * could not change it, and neither could a regression. Parity was a constant, not a fact.
 *
 * A record states that a named person compared one candidate artifact against one
 * reference image and reached a verdict. It carries the sha256 of both. If either side
 * changes afterwards, the record no longer describes what is on screen, so it is reported
 * as stale rather than silently carried forward.
 *
 * Nothing here fabricates approval. An empty record set means every case is unreviewed,
 * which is what it should say.
 */

export type Verdict = "approved" | "rejected";

export interface ReviewRecord {
  /** The reference case this decision is about. */
  readonly case: string;
  readonly verdict: Verdict;
  /** Who made the decision. A record without a real reviewer is not a review. */
  readonly reviewer: string;
  /** ISO date the comparison was made. */
  readonly date: string;
  /** sha256 of the reference image as reviewed. */
  readonly referenceSha256: string;
  /** sha256 of the generated candidate PNG as reviewed. */
  readonly candidateSha256: string;
  /** Why. Required for a rejection, and useful for an approval. */
  readonly notes?: string;
}

export type ParityStatus =
  /** A valid record approves this exact pair of artifacts. */
  | "approved"
  /** A valid record rejects this exact pair. */
  | "rejected"
  /** A record exists but the artifacts have changed since it was made. */
  | "stale"
  /** No record exists for this case. */
  | "unreviewed"
  /** The reference image is not in this checkout, so no review is possible here. */
  | "unreviewable";

export interface ParityResult {
  readonly status: ParityStatus;
  readonly detail: string;
  readonly record?: ReviewRecord;
}

export async function loadReviewRecords(path: string): Promise<readonly ReviewRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as { records?: ReviewRecord[] };
    return parsed.records ?? [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * The parity status of one case, derived from the records and the current bytes.
 *
 * Deliberately never returns `approved` on a hash mismatch. A regenerated candidate is a
 * different picture, and an approval of the old one says nothing about it.
 */
export function parityOf(
  caseId: string,
  referenceSha256: string | null,
  candidateSha256: string | undefined,
  records: readonly ReviewRecord[],
): ParityResult {
  if (referenceSha256 === null) {
    return {
      status: "unreviewable",
      detail: "The reference image is not present in this checkout, so parity cannot be reviewed here.",
    };
  }
  if (candidateSha256 === undefined) {
    return { status: "unreviewable", detail: "No candidate artifact was produced for this case." };
  }
  const record = records.find((entry) => entry.case === caseId);
  if (record === undefined) {
    return { status: "unreviewed", detail: "No human review has been recorded for this case." };
  }
  if (record.referenceSha256 !== referenceSha256) {
    return {
      status: "stale",
      detail: `The recorded review was made against a different reference image (${short(record.referenceSha256)}, now ${short(referenceSha256)}).`,
      record,
    };
  }
  if (record.candidateSha256 !== candidateSha256) {
    return {
      status: "stale",
      detail: `The candidate has changed since it was reviewed (${short(record.candidateSha256)}, now ${short(candidateSha256)}). Re-review is required.`,
      record,
    };
  }
  return {
    status: record.verdict,
    detail: `${record.verdict === "approved" ? "Approved" : "Rejected"} by ${record.reviewer} on ${record.date}${record.notes ? `: ${record.notes}` : "."}`,
    record,
  };
}

/** Parity is met only when a live record approves the exact artifacts on disk. */
export function parityMet(status: ParityStatus): boolean {
  return status === "approved";
}

function short(hash: string): string {
  return hash.slice(0, 12);
}
