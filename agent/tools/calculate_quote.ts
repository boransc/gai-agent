import { defineTool } from "eve/tools";
import { z } from "zod";
import { activeBusiness as config } from "../lib/quote-agent/config";
import type { Enquiry } from "../lib/quote-agent/types";
import { findMissingFields } from "../lib/quote-agent/eligibility";
import { calculateQuote, findService } from "../lib/quote-agent/pricing";
import { enquiryState } from "../lib/state";

const DETAIL_FIELD_IDS = new Set(config.jobDetailFields.map((f) => f.id));

/**
 * Built from the business's own `jobDetailFields` rather than hand-written,
 * so a different business's config changes what this tool asks for without
 * touching this file. `serviceId` and `preferredDate` are the only fixed
 * keys — everything else is whatever the business declared.
 */
const detailFieldsShape = Object.fromEntries(
  config.jobDetailFields.map((field) => {
    const base = field.type === "number" ? z.number() : z.string();
    const description = field.example
      ? `${field.label} — e.g. '${field.example}'`
      : field.label;
    return [field.id, base.optional().describe(description)];
  }),
);

export default defineTool({
  description: `Apply ${config.businessName}'s configured pricing rules to the job. Requires lookup_postcode to have confirmed an in-area postcode first. Returns needs_info naming exactly which details are still outstanding, service_not_offered, or quote_ready. This tool deliberately returns NO prices — call check_job_eligibility to obtain the figures you are allowed to share with the customer.`,
  inputSchema: z.object({
    serviceId: z
      .string()
      .describe(
        `The configured service id. One of: ${config.services.map((s) => s.id).join(", ")}.`,
      ),
    preferredDate: z.string().optional(),
    ...detailFieldsShape,
  }),
  async execute(input) {
    const state = enquiryState.get();

    // Step 1 of the pipeline must have succeeded. Throwing here surfaces to the
    // model as a tool error, steering it back rather than letting it price a
    // job whose location was never validated.
    if (!state.postcode) {
      throw new Error(
        "No confirmed in-area postcode for this enquiry. Call lookup_postcode first and only continue if it returns in_area.",
      );
    }

    // An unrecognised service is a business rule, not a judgement call: reject
    // it with an explanation rather than sending it for review.
    const service = findService(input.serviceId, config);
    if (!service) {
      return {
        status: "service_not_offered" as const,
        requested: input.serviceId,
        servicesOffered: config.services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
        })),
        message: `${config.businessName} does not offer "${input.serviceId}". Tell the customer what is offered instead. Do not price the requested job.`,
      };
    }

    // Merge what we've just been told into the durable enquiry. Only defined
    // values overwrite — a field omitted on this call keeps its earlier
    // answer. serviceId and preferredDate are fixed keys; everything else
    // is a business-declared detail field, keyed by id.
    const enquiry: Enquiry = {
      ...state.enquiry,
      serviceId: input.serviceId,
      preferredDate: input.preferredDate ?? state.enquiry.preferredDate,
      details: { ...state.enquiry.details },
    };
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && DETAIL_FIELD_IDS.has(key)) {
        enquiry.details[key] = value as string | number;
      }
    }
    enquiryState.update((s) => ({ ...s, enquiry, quote: null }));

    const missingFields = findMissingFields(enquiry, config);
    if (missingFields.length > 0) {
      return {
        status: "needs_info" as const,
        missingFields,
        message:
          "Ask the customer for these details. Do not guess or substitute defaults, and do not quote until they are supplied.",
      };
    }

    const quote = calculateQuote(enquiry, state.postcode.distanceMiles, config);
    enquiryState.update((s) => ({ ...s, quote }));

    // Withholding the figures is the point. The model cannot state a price it
    // has never seen, so the review check in check_job_eligibility cannot be
    // skipped on the way to giving the customer a number.
    return {
      status: "quote_ready" as const,
      serviceName: quote.serviceName,
      lineItemLabels: quote.lineItems.map((item) => item.label),
      isEstimate: quote.isEstimate,
      message:
        "The quote has been calculated and stored, and no figures are included here by design. Call check_job_eligibility now to run the business's review rules and receive the itemised quote you may share.",
    };
  },
});
