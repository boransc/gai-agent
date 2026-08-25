import { defineTool } from "eve/tools";
import { z } from "zod";
import { activeBusiness as config } from "../lib/quote-agent/config";
import { checkJobEligibility } from "../lib/quote-agent/eligibility";
import { enquiryState } from "../lib/state";

export default defineTool({
  description:
    "Run the business's review rules against the calculated quote and return the itemised figures. This is the only source of prices you may share with the customer. Requires calculate_quote to have returned quote_ready. Returns accepted (you may give the customer the quote and offer to book) or needs_human_review (share the quote only as an indication and explain a person will confirm).",
  inputSchema: z.object({}),
  async execute() {
    const { enquiry, postcode, quote } = enquiryState.get();

    if (!quote || !postcode) {
      throw new Error(
        "No calculated quote for this enquiry. Call lookup_postcode and then calculate_quote first; do not state any price until this tool returns one.",
      );
    }

    const result = checkJobEligibility(
      enquiry,
      quote,
      postcode.borderline,
      config,
    );

    const shared = {
      currency: quote.currency,
      service: quote.serviceName,
      location: postcode.location,
      distanceMiles: quote.distanceMiles,
      lineItems: quote.lineItems,
      total: quote.total,
      totalMax: quote.totalMax,
      isEstimate: quote.isEstimate,
      vat: quote.vat ?? null,
      disclaimers: quote.disclaimers,
    };

    if (result.status === "needs_human_review") {
      // Recorded server-side only; never part of the return value.
      enquiryState.update((s) => ({
        ...s,
        eligibility: "needs_human_review",
        internalReviewReasons: result.matchedRules.map((rule) => rule.reason),
      }));

      return {
        status: "needs_human_review" as const,
        quote: shared,
        /** Customer-safe wording. No internal thresholds appear here. */
        customerExplanations: result.matchedRules.map(
          (rule) => rule.customerExplanation,
        ),
        message: `Share the figures as an indication only. Explain that someone from ${config.businessName} will confirm before the job is booked, using the customerExplanations wording. Do not promise a booking.`,
      };
    }

    enquiryState.update((s) => ({
      ...s,
      eligibility: "accepted",
      internalReviewReasons: [],
    }));

    return {
      status: "accepted" as const,
      quote: shared,
      customerExplanations: [] as string[],
      message:
        "Give the customer the itemised quote exactly as provided, note any disclaimers, and offer to book the job.",
    };
  },
});
