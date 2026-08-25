import { findService } from "./pricing";
import type {
  BusinessConfig,
  Enquiry,
  MatchedReviewRule,
  MissingField,
  Quote,
} from "./types";

const FIELD_LABELS: Record<string, string> = {
  postcode: "the postcode the vehicle is at",
  serviceId: "which job you need doing",
  vehicleMake: "the vehicle make",
  vehicleModel: "the vehicle model",
  faultDescription: "a description of the fault",
};

/**
 * Which required fields are still outstanding. Universal requirements come
 * from config; `faultDescription` is required only for services that declare
 * it, because a diagnostic job can't be estimated without it while a battery
 * swap can.
 */
export function findMissingFields(
  enquiry: Enquiry,
  config: BusinessConfig,
): MissingField[] {
  const missing: MissingField[] = [];

  for (const field of config.requiredEnquiryFields) {
    const value = enquiry[field];
    if (value === undefined || String(value).trim() === "") {
      missing.push({
        field,
        reason: `We need ${FIELD_LABELS[field] ?? field} before we can price this up.`,
      });
    }
  }

  const service = enquiry.serviceId
    ? findService(enquiry.serviceId, config)
    : undefined;
  if (
    service?.faultDescriptionRequired &&
    (enquiry.faultDescription === undefined ||
      enquiry.faultDescription.trim() === "")
  ) {
    missing.push({
      field: "faultDescription",
      reason: `"${service.name}" is a diagnostic job, so we need a description of what the vehicle is doing before we can estimate the time.`,
    });
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
      case "faultDescriptionMatches":
        hit =
          enquiry.faultDescription !== undefined &&
          new RegExp(condition.pattern, condition.flags ?? "").test(
            enquiry.faultDescription,
          );
        break;
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
