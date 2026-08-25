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
  /** [low, high] parts estimate. Omitted for labour-only services. */
  partsEstimateRange?: [number, number];
  /**
   * Vague/diagnostic services can't be estimated at all without the
   * customer describing the fault, so they make it a hard requirement.
   */
  faultDescriptionRequired: boolean;
}

/**
 * A review condition. Each variant is matched structurally in
 * `evaluateReviewRules` — never eval'd.
 */
export type ReviewCondition =
  | { kind: "jobValueAbove"; amount: number }
  | { kind: "jobValueBelowMinimum" }
  | { kind: "borderlineServiceArea" }
  | { kind: "faultDescriptionMatches"; pattern: string; flags?: string }
  /**
   * Always review these services, whatever the customer wrote. Needed because
   * keyword matching only sees `faultDescription`, which is optional on
   * flat-rate services — a customer naming a safety-critical job outright
   * would otherwise skip review entirely.
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

/** Fields every enquiry must supply, regardless of service. */
export type RequiredEnquiryField =
  | "postcode"
  | "serviceId"
  | "vehicleMake"
  | "vehicleModel";

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
  requiredEnquiryFields: RequiredEnquiryField[];
}

/**
 * What we know about the customer's job so far. Every field is optional
 * because an enquiry is built up over a conversation; the pipeline decides
 * when enough is present.
 */
export interface Enquiry {
  postcode?: string;
  serviceId?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  faultDescription?: string;
  preferredDate?: string;
}

/**
 * A quote line. `amountMax` is present only when the line is genuinely a
 * range (parts we can't know until we've seen the car); a fixed line has
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
