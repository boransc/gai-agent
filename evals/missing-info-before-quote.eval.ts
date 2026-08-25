import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

const NO_MONEY = satisfies<string>(
  (reply) => !/£|\bgbp\b|\bpounds?\b/i.test(reply),
  "reply quotes no price",
);

/**
 * A diagnostic job cannot be estimated without the customer describing the
 * fault, and no required field may be filled in with a guess to get a number
 * out of the pricing tool. The agent must come back and ask.
 */
export default defineEval({
  description:
    "A diagnostic enquiry with no fault description asks rather than quoting.",
  async test(t) {
    await t.send("Something's wrong with my Ford Focus at CR0 2RF, can you look at it?");

    t.succeeded();
    t.notCalledTool("check_job_eligibility");
    t.notCalledTool("request_booking");
    t.check(t.reply, NO_MONEY);
  },
});
