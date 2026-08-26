import type {
  BusinessConfig,
  Enquiry,
  MatchedReviewRule,
  MissingField,
  Quote,
} from "./types";

/**
 * Which job-detail fields are still outstanding for this enquiry. `postcode`
 * and `serviceId` are never checked here — the pipeline already guarantees
 * both by the time this runs (lookup_postcode confirms the postcode;
 * calculate_quote rejects an unknown serviceId before this is called).
 */
export function findMissingFields(
  enquiry: Enquiry,
  config: BusinessConfig,
): MissingField[] {
  const missing: MissingField[] = [];

  for (const field of config.jobDetailFields) {
    const required =
      field.requirement.kind === "always" ||
      (field.requirement.kind === "forServices" &&
        enquiry.serviceId !== undefined &&
        field.requirement.serviceIds.includes(enquiry.serviceId));
    if (!required) continue;

    const value = enquiry.details[field.id];
    if (value === undefined || String(value).trim() === "") {
      missing.push({
        field: field.id,
        reason:
          field.missingFieldReason ??
          `We need ${field.label} before we can price this up.`,
      });
    }
  }

  return missing;
}

/**
 * Matches the configured review conditions structurally. Note the deliberate
 * asymmetry on the money rules: the *low* end of the range is tested against
 * the minimum and the *high* end against the upper threshold, so a quote whose
 * range straddles either boundary lands in front of a human rather than being
 * waved through.
 */
export function evaluateReviewRules(
  enquiry: Enquiry,
  quote: Quote,
  borderlineServiceArea: boolean,
  config: BusinessConfig,
): MatchedReviewRule[] {
  const matched: MatchedReviewRule[] = [];

  for (const rule of config.reviewRules) {
    const { condition } = rule;
    let hit = false;

    switch (condition.kind) {
      case "jobValueAbove":
        hit = quote.totalMax > condition.amount;
        break;
      case "jobValueBelowMinimum":
        hit = quote.total < config.minimumJobValue;
        break;
      case "borderlineServiceArea":
        hit = borderlineServiceArea;
        break;
      case "detailMatches": {
        const value = enquiry.details[condition.fieldId];
        hit =
          typeof value === "string" &&
          new RegExp(condition.pattern, condition.flags ?? "").test(value);
        break;
      }
      case "serviceIn":
        hit =
          enquiry.serviceId !== undefined &&
          condition.serviceIds.includes(enquiry.serviceId);
        break;
    }

    if (hit) {
      matched.push({
        ruleId: rule.id,
        reason: rule.reason,
        customerExplanation: rule.customerExplanation,
      });
    }
  }

  return matched;
}

/**
 * Tool 3 of 3. Given a completed quote, decides whether the business can
 * simply accept the job or whether a human needs to look at it first.
 */
export function checkJobEligibility(
  enquiry: Enquiry,
  quote: Quote,
  borderlineServiceArea: boolean,
  config: BusinessConfig,
):
  | { status: "accepted"; quote: Quote }
  | { status: "needs_human_review"; quote: Quote; matchedRules: MatchedReviewRule[] } {
  const matchedRules = evaluateReviewRules(
    enquiry,
    quote,
    borderlineServiceArea,
    config,
  );

  return matchedRules.length > 0
    ? { status: "needs_human_review", quote, matchedRules }
    : { status: "accepted", quote };
}
