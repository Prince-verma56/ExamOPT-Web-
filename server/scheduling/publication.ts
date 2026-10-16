import type { RunOutcome } from "./domain";

/**
 * Publication gate. The reference refused runs whose stored status was not
 * FEASIBLE or that recorded hard conflicts. ExamOpt also requires the run to
 * come from this engine (so its status was produced by the independent
 * validator), the saved assignments to pass the validator again against
 * today's data, and the stored invigilator duties to break no rule.
 */
export interface PublishGateInput {
  source: "engine" | "legacy";
  outcome: RunOutcome;
  /** Validation stored with the run at generation time. */
  storedValid: boolean | null;
  /** The saved assignments re-validated against the current dataset. */
  liveValidation: { valid: boolean; violationCount: number };
  /** Stored invigilator duties re-checked against the current faculty roster; null when the run has none. */
  invigilation: { valid: boolean; violations: number } | null;
  isActivePublication: boolean;
}

export type PublishRejection = { code: "LEGACY_RUN" | "NOT_FEASIBLE" | "NOT_VALIDATED" | "LIVE_VALIDATION_FAILED" | "INVIGILATION_INVALID" | "ALREADY_ACTIVE"; message: string };

export function publishGate(input: PublishGateInput): { allowed: boolean; rejections: PublishRejection[] } {
  const rejections: PublishRejection[] = [];
  if (input.isActivePublication) rejections.push({ code: "ALREADY_ACTIVE", message: "This run is already the active published timetable." });
  if (input.source === "legacy") rejections.push({ code: "LEGACY_RUN", message: "This run was not produced by the ExamOpt engine, so its status was never independently validated. Generate a new run and publish that." });
  if (input.outcome !== "FEASIBLE") rejections.push({ code: "NOT_FEASIBLE", message: `Only FEASIBLE runs can be published; this run is ${input.outcome}.` });
  if (input.source === "engine" && input.storedValid !== true) rejections.push({ code: "NOT_VALIDATED", message: "The run has no passing validation report from generation time." });
  if (!input.liveValidation.valid) rejections.push({ code: "LIVE_VALIDATION_FAILED", message: `Against today's data the schedule has ${input.liveValidation.violationCount} hard-constraint violation${input.liveValidation.violationCount === 1 ? "" : "s"}. The data changed after the run; generate a new run.` });
  if (input.invigilation && !input.invigilation.valid) rejections.push({ code: "INVIGILATION_INVALID", message: `${input.invigilation.violations} invigilation rule violation${input.invigilation.violations === 1 ? "" : "s"} against the current faculty roster.` });
  return { allowed: rejections.length === 0, rejections };
}
