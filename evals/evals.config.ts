import { defineEvalConfig } from "eve/evals";

/**
 * Every eval here is deterministic — they assert on which tools ran, in what
 * order, and whether a price reached the customer — so no judge model is
 * configured. Add `judge` if a future eval needs to grade tone or phrasing.
 */
export default defineEvalConfig({});
