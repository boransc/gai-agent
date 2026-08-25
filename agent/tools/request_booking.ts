import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { activeBusiness as config } from "../lib/quote-agent/config";
import { enquiryState } from "../lib/state";

export default defineTool({
  description: `Record the customer's booking request for ${config.businessName}. Requires a quote from check_job_eligibility. If the job was accepted this reserves the visit; if it needed review this logs a callback request instead. The customer is asked to confirm before this runs.`,
  inputSchema: z.object({
    contactName: z.string().min(1).describe("The customer's name."),
    contactPhone: z
      .string()
      .min(6)
      .describe("A phone number the mechanic can reach them on."),
    preferredDate: z
      .string()
      .optional()
      .describe("When they'd like the visit, in their own words."),
  }),
  // Creating a booking is an outward-facing commitment, so a person confirms
  // every time. This also makes the write safe across durable step replays:
  // a re-run cannot fire without a fresh human decision.
  approval: always(),
  async execute({ contactName, contactPhone, preferredDate }, ctx) {
    const { quote, eligibility, booking } = enquiryState.get();

    if (!quote || !eligibility) {
      throw new Error(
        "No quote has been produced for this enquiry yet. Run the quote steps first; do not take booking details before the customer has seen a price.",
      );
    }

    // Idempotency: the reference is derived from the tool call id rather than
    // generated, so a replayed step returns the same booking instead of a new one.
    if (booking) {
      return { ...booking, alreadyRecorded: true as const };
    }

    const kind =
      eligibility === "accepted"
        ? ("booked" as const)
        : ("callback_requested" as const);

    const record = {
      reference: `QF-${ctx.callId.slice(-6).toUpperCase()}`,
      contactName,
      contactPhone,
      preferredDate,
      kind,
    };

    // A production build would write to the calendar or CRM here. For the
    // prototype the request lives in durable session state.
    enquiryState.update((s) => ({ ...s, booking: record }));

    return {
      ...record,
      alreadyRecorded: false as const,
      message:
        kind === "booked"
          ? `Confirm the reference and tell them a mechanic will be in touch to agree a time. Do not invent a specific appointment slot — none has been assigned.`
          : `Explain that this is a callback request, not a confirmed booking, and that ${config.businessName} will be in touch to go through the details.`,
    };
  },
});
