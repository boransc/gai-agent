/**
 * QuoteAgent domain types.
 *
 * Everything a business can configure lives here as *data*. There is
 * deliberately no place for a business to supply an expression, formula or
 * snippet of code: review conditions are a closed, discriminated set of
 * shapes, so no part of the pipeline ever needs to parse or evaluate a
 * business-supplied string.
 */

export type Currency = "GBP";

export type PricingModel = "flat" | "time-based";

export interface ServiceDefinition {
  id: string;
  name: string;
  /** Shown to the customer when listing what the business does. */
  description: string;
  pricingModel: PricingModel;
  /** Required when pricingModel === "flat". */
  flatRate?: number;
  /** Both required when pricingModel === "time-based". */
  estimatedHours?: number;
  hourlyRate?: number;
  /** [low, high] materials/parts estimate. Omitted for labour-only services. */
  partsEstimateRange?: [number, number];
}

/**
 * A review condition. Each variant is matched structurally in
 * `evaluateReviewRules` — never eval'd.
 */
export type ReviewCondition =
  | { kind: "jobValueAbove"; amount: number }
  | { kind: "jobValueBelowMinimum" }
  | { kind: "borderlineServiceArea" }
  /** Matches a job-detail field's text against a pattern, e.g. safety keywords. */
  | { kind: "detailMatches"; fieldId: string; pattern: string; flags?: string }
  /**
   * Always review these services, whatever the customer wrote. Needed because
   * a `detailMatches` rule only sees a field that's actually present, which
   * may be optional on flat-rate services — a customer naming a
   * safety-critical job outright would otherwise skip review entirely.
   */
  | { kind: "serviceIn"; serviceIds: string[] };

export interface ReviewRule {
  id: string;
  condition: ReviewCondition;
  /**
   * Why this needs review, written for the business's own queue. Never shown
   * to the customer — it can name internal thresholds and margins.
   */
  reason: string;
  /**
   * What the customer is told instead. Says that a person will confirm,
   * without disclosing the rule that triggered it.
   */
  customerExplanation: string;
}

/**
 * When a job-detail field must be answered. `postcode` and `serviceId` are
 * never part of this list — the pipeline itself guarantees both are present
 * and valid before a job-detail field is ever checked (lookup_postcode
 * confirms the postcode; calculate_quote rejects an unknown serviceId before
 * looking at anything else).
 */
export type JobDetailRequirement =
  | { kind: "always" }
  | { kind: "optional" }
  /** Required only for the named services — e.g. a fault description that's
   * only needed for diagnostic-style jobs. */
  | { kind: "forServices"; serviceIds: string[] };

/**
 * One piece of job-specific information a business needs before it can quote
 * — a mobile mechanic's vehicle make, a gardener's plot size, a
 * photographer's guest count. This is the whole of what varies between
 * businesses about what an enquiry collects: the pipeline, the tools, and
 * the review-rule matching are the same regardless of which fields a
 * business declares here.
 */
export interface JobDetailField {
  /** Key this field is stored under in `Enquiry.details`, and read back by
   * `detailMatches` review conditions. */
  id: string;
  /** Shown to the customer in "we need ___" copy and to the model as the
   * tool-schema description. */
  label: string;
  type: "text" | "number";
  /** Shown to the model as a worked example, e.g. "Ford" for a make. */
  example?: string;
  requirement: JobDetailRequirement;
  /** Overrides the generic "We need {label}..." wording when asking for
   * this field — for phrasing that explains *why* (e.g. "this is a
   * diagnostic job, so..."). */
  missingFieldReason?: string;
}

export interface BusinessConfig {
  businessName: string;
  currency: Currency;
  /** Where the business travels from; the origin for every distance check. */
  basePostcode: string;
  /** Hard limit — beyond this the job is rejected, not reviewed. */
  serviceRadiusMiles: number;
  /** Travel within this radius carries no surcharge. */
  freeRadiusMiles: number;
  distanceSurchargePerMile: number;
  callOutFee: number;
  /** Jobs priced below this are flagged for review, not silently uplifted. */
  minimumJobValue: number;
  vatApplicable: boolean;
  /** e.g. 0.2 for 20%. Only read when vatApplicable is true. */
  vatRate?: number;
  services: ServiceDefinition[];
  reviewRules: ReviewRule[];
  /** What this business needs to know about a job beyond postcode/service —
   * see `JobDetailField`. */
  jobDetailFields: JobDetailField[];
  /** Short prefix for booking references, e.g. "QF" -> "QF-A1B2C3". */
  bookingReferencePrefix: string;
  /**
   * A few complete example enquiries shown as tappable starters on the empty
   * chat. Each one should be answerable in one message — postcode, service,
   * and whatever job-detail fields make it a real enquiry. Optional: a
   * business that doesn't supply any just gets no starter suggestions.
   */
  exampleEnquiries?: readonly string[];
}

/**
 * What we know about the customer's job so far. Every field is optional
 * because an enquiry is built up over a conversation; the pipeline decides
 * when enough is present.
 */
export interface Enquiry {
  postcode?: string;
  serviceId?: string;
  preferredDate?: string;
  /** Business-specific answers, keyed by `JobDetailField.id`. */
  details: Record<string, string | number>;
}

/**
 * A quote line. `amountMax` is present only when the line is genuinely a
 * range (materials we can't cost until we've seen the job); a fixed line has
 * `amount` alone.
 */
export interface QuoteLineItem {
  label: string;
  amount: number;
  amountMax?: number;
  note?: string;
}

export interface Quote {
  currency: Currency;
  serviceId: string;
  serviceName: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  subtotalMax: number;
  vat?: { rate: number; amount: number; amountMax: number };
  total: number;
  totalMax: number;
  /** True when any line is a range, i.e. the total is not yet firm. */
  isEstimate: boolean;
  disclaimers: string[];
  distanceMiles: number;
}

export type PostcodeLookupResult =
  | { status: "invalid_postcode"; postcode: string }
  | {
      status: "resolved";
      postcode: string;
      location: string;
      region: string;
      latitude: number;
      longitude: number;
      distanceMiles: number;
      inServiceArea: boolean;
      withinFreeRadius: boolean;
      /** Inside the radius, but into the surcharge band. */
      borderline: boolean;
    };

export interface MissingField {
  field: string;
  reason: string;
}

export interface MatchedReviewRule {
  ruleId: string;
  reason: string;
  customerExplanation: string;
}

export type EligibilityResult =
  | { status: "accepted"; quote: Quote }
  | { status: "needs_info"; missingFields: MissingField[] }
  | {
      status: "needs_human_review";
      quote: Quote;
      matchedRules: MatchedReviewRule[];
    }
  | { status: "rejected"; reason: string; detail: string };
