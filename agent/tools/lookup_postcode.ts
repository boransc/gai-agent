import { defineTool } from "eve/tools";
import { z } from "zod";
import { activeBusiness as config } from "../lib/quote-agent/config";
import { lookupPostcode } from "../lib/quote-agent/postcode";
import { enquiryState } from "../lib/state";

export default defineTool({
  description:
    "Resolve a UK postcode and measure it against the business's configured service area. This is always the first step of an enquiry — no job can be priced until it succeeds. Returns one of: invalid_postcode (ask the customer to check it), out_of_area (decline the job, do not quote), or in_area.",
  inputSchema: z.object({
    postcode: z
      .string()
      .min(2)
      .describe("The UK postcode where the vehicle is located, e.g. 'CR0 2RF'."),
  }),
  async execute({ postcode }) {
    const result = await lookupPostcode(postcode, config);

    if (result.status === "invalid_postcode") {
      // Deliberately writes nothing: an unresolved postcode must not unlock pricing.
      return {
        status: "invalid_postcode" as const,
        message: `"${postcode}" could not be found. Ask the customer to double-check it. Do not guess a nearby postcode.`,
      };
    }

    if (!result.inServiceArea) {
      // Clear any earlier location so a rejected job can't be priced.
      enquiryState.update((s) => ({ ...s, postcode: null, quote: null }));
      return {
        status: "out_of_area" as const,
        location: result.location,
        distanceMiles: result.distanceMiles,
        serviceRadiusMiles: config.serviceRadiusMiles,
        message: `${result.location} is ${result.distanceMiles} miles from base, outside the ${config.serviceRadiusMiles}-mile service area. Politely explain that ${config.businessName} cannot travel that far, and do not provide a price.`,
      };
    }

    enquiryState.update((s) => ({
      ...s,
      enquiry: { ...s.enquiry, postcode: result.postcode },
      postcode: {
        postcode: result.postcode,
        location: result.location,
        distanceMiles: result.distanceMiles,
        borderline: result.borderline,
      },
      // A change of location invalidates any quote already calculated.
      quote: null,
    }));

    return {
      status: "in_area" as const,
      postcode: result.postcode,
      location: result.location,
      distanceMiles: result.distanceMiles,
      /** Distance is straight-line; road mileage runs longer. */
      approximate: true,
      message: `${result.location} is inside the service area. Collect the job details next, then call calculate_quote.`,
    };
  },
});
