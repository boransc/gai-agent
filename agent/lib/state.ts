import { defineState } from "eve/context";
import type { Enquiry, Quote } from "./quote-agent/types";

/**
 * Durable per-session record of the enquiry as it's built up.
 *
 * This slot is what makes the pipeline order enforceable. eve has no
 * declarative "tool A before tool B" primitive — hooks are observe-only and
 * dynamic capabilities only control which tools are *exposed* — so each tool
 * reads this state and refuses to run when its prerequisites are absent.
 */
export interface ResolvedPostcode {
  postcode: string;
  location: string;
  distanceMiles: number;
  /** Inside the radius but into the surcharge band — a review trigger. */
  borderline: boolean;
}

export interface EnquiryState {
  enquiry: Enquiry;
  /** Set only by lookup_postcode, and only for an in-area postcode. */
  postcode: ResolvedPostcode | null;
  /**
   * Set by calculate_quote. Held here rather than returned to the model so
   * that check_job_eligibility is the only path to the actual figures.
   */
  quote: Quote | null;
  /**
   * Why the job was flagged, in the business's own words. Kept in session
   * state rather than in a tool's return value: eve delivers the full tool
   * output to channels and clients, so anything returned here would reach the
   * customer's browser. The ops queue reads it server-side.
   */
  internalReviewReasons: string[];
  /** Outcome of the last eligibility check; gates whether booking is offered. */
  eligibility: "accepted" | "needs_human_review" | null;
  booking: {
    reference: string;
    contactName: string;
    contactPhone: string;
    preferredDate?: string;
    /** A confirmed slot, or a callback when the job needed review. */
    kind: "booked" | "callback_requested";
  } | null;
}

export const enquiryState = defineState<EnquiryState>(
  "quote-agent.enquiry",
  () => ({
    enquiry: { details: {} },
    postcode: null,
    quote: null,
    internalReviewReasons: [],
    eligibility: null,
    booking: null,
  }),
);
