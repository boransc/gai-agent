import { google } from "@ai-sdk/google";
import { defineAgent } from "eve";

export default defineAgent({
  // Direct provider rather than the AI Gateway, reading
  // GOOGLE_GENERATIVE_AI_API_KEY from the environment. The reasoning load here
  // is deliberately light: pricing, service-area and review decisions all live
  // in code under agent/lib/quote-agent, not in the model.
  model: google("gemini-3.6-flash"),
});
