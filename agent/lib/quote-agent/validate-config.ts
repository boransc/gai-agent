import type { BusinessConfig } from "./types";

/**
 * Catches the class of bug found by hand earlier in this project: a review
 * rule that can never fire, a condition referencing a service that doesn't
 * exist, a pricing field missing for the model that needs it. Pure and
 * synchronous, so it costs nothing to run on every config load.
 */
export function validateBusinessConfig(config: BusinessConfig): string[] {
  const issues: string[] = [];
  const serviceIds = new Set(config.services.map((s) => s.id));
  const fieldIds = new Set(config.jobDetailFields.map((f) => f.id));

  for (const [label, ids] of [
    ["service", config.services.map((s) => s.id)],
    ["job detail field", config.jobDetailFields.map((f) => f.id)],
    ["review rule", config.reviewRules.map((r) => r.id)],
  ] as const) {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) issues.push(`Duplicate ${label} id "${id}".`);
      seen.add(id);
    }
  }

  for (const service of config.services) {
    if (service.pricingModel === "flat" && service.flatRate === undefined) {
      issues.push(`Service "${service.id}" is priced flat but has no flatRate.`);
    }
    if (
      service.pricingModel === "time-based" &&
      (service.estimatedHours === undefined || service.hourlyRate === undefined)
    ) {
      issues.push(
        `Service "${service.id}" is time-based but is missing estimatedHours or hourlyRate.`,
      );
    }
  }

  for (const field of config.jobDetailFields) {
    if (field.requirement.kind === "forServices") {
      for (const id of field.requirement.serviceIds) {
        if (!serviceIds.has(id)) {
          issues.push(
            `Job detail field "${field.id}" is required for unknown service "${id}".`,
          );
        }
      }
    }
  }

  for (const rule of config.reviewRules) {
    const { condition } = rule;
    if (condition.kind === "serviceIn") {
      for (const id of condition.serviceIds) {
        if (!serviceIds.has(id)) {
          issues.push(`Review rule "${rule.id}" references unknown service "${id}".`);
        }
      }
    }
    if (condition.kind === "detailMatches" && !fieldIds.has(condition.fieldId)) {
      issues.push(
        `Review rule "${rule.id}" matches unknown job detail field "${condition.fieldId}".`,
      );
    }
  }

  // The exact bug this project shipped once: a minimum-job-value rule that
  // no configured service can ever price below.
  const hasBelowMinimumRule = config.reviewRules.some(
    (rule) => rule.condition.kind === "jobValueBelowMinimum",
  );
  if (hasBelowMinimumRule && config.services.length > 0) {
    const cheapestPossible = Math.min(
      ...config.services.map((service) => {
        const labour =
          service.pricingModel === "flat"
            ? (service.flatRate ?? Infinity)
            : (service.estimatedHours ?? Infinity) * (service.hourlyRate ?? Infinity);
        const materials = service.partsEstimateRange?.[0] ?? 0;
        return config.callOutFee + labour + materials;
      }),
    );
    if (!Number.isFinite(cheapestPossible) || cheapestPossible >= config.minimumJobValue) {
      issues.push(
        `minimumJobValue (${config.minimumJobValue}) can never trigger: the cheapest possible job costs ${cheapestPossible}. The below-minimum review rule will never fire.`,
      );
    }
  }

  if (config.freeRadiusMiles > config.serviceRadiusMiles) {
    issues.push(
      `freeRadiusMiles (${config.freeRadiusMiles}) is greater than serviceRadiusMiles (${config.serviceRadiusMiles}) — no job can ever be charged a distance surcharge.`,
    );
  }

  if (config.vatApplicable && config.vatRate === undefined) {
    issues.push("vatApplicable is true but vatRate is unset — VAT will silently not apply.");
  }

  return issues;
}

/** Throws with every issue listed, rather than letting a bad config ship quietly. */
export function assertValidBusinessConfig(config: BusinessConfig): void {
  const issues = validateBusinessConfig(config);
  if (issues.length > 0) {
    throw new Error(
      `Invalid business config for "${config.businessName}":\n` +
        issues.map((issue) => `  - ${issue}`).join("\n"),
    );
  }
}
