import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

const NO_MONEY = satisfies<string>(
  (reply) => !/£|\bgbp\b|\bpounds?\b/i.test(reply),
  "reply quotes no price",
);

/**
 * Work the business does not do must be declined outright, never priced and
 * never sent for review — it is a business rule, not a judgement call. The
 * agent has no pricing data for it, so any figure would be invented.
 */
export default defineEval({
  description: "An unsupported service is declined without a price.",
  async test(t) {
    await t.send(
      "I need a full clutch replacement on my Ford Focus at CR0 2RF. How much?",
    );

    t.succeeded();
    t.notCalledTool("check_job_eligibility");
    t.notCalledTool("request_booking");
    t.check(t.reply, NO_MONEY);
  },
});
