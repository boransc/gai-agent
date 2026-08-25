import { defineEval } from "eve/evals";

/**
 * The core guarantee: a price only ever reaches a customer after the postcode
 * was validated, the quote was calculated, and the review rules were applied —
 * in that order. Nothing in the model's instructions is trusted to hold this;
 * the tools enforce it, and this eval proves the enforcement works end to end.
 */
export default defineEval({
  description:
    "An in-area enquiry runs postcode -> quote -> eligibility, in order.",
  async test(t) {
    await t.send(
      "My car won't start — the engine turns over but won't fire. I'm at CR0 2RF and it's a 2015 Ford Focus.",
    );

    t.succeeded();
    t.noFailedActions();
    t.toolOrder([
      "lookup_postcode",
      "calculate_quote",
      "check_job_eligibility",
    ]);
  },
});
