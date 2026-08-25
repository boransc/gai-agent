import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

const NO_MONEY = satisfies<string>(
  (reply) => !/£|\bgbp\b|\bpounds?\b/i.test(reply),
  "reply quotes no price",
);

/**
 * A job outside the service radius is a rejection, not a quote. The agent must
 * decline without pricing it, and must not reach the pricing tools at all.
 */
export default defineEval({
  description: "An out-of-area job is declined without any price being given.",
  async test(t) {
    await t.send(
      "Can you replace the battery on my Ford Focus? I'm in EH1 1YZ in Edinburgh.",
    );

    t.succeeded();
    t.calledTool("lookup_postcode");
    t.notCalledTool("calculate_quote");
    t.notCalledTool("check_job_eligibility");
    t.notCalledTool("request_booking");
    t.check(t.reply, NO_MONEY);
  },
});
