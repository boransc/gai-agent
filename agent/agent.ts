import { google } from "@ai-sdk/google";
import { defineAgent, defineDynamic } from "eve";
import { DEFAULT_MODEL_ID, isAvailableModelId } from "./lib/models";

export default defineAgent({
  // Direct provider rather than the AI Gateway, reading
  // GOOGLE_GENERATIVE_AI_API_KEY from the environment. The reasoning load here
  // is deliberately light: pricing, service-area and review decisions all live
  // in code under agent/lib/quote-agent, not in the model.
  //
  // Dynamic so the browser can pick which Gemini model to call (see the model
  // picker in app/_components/agent-chat.tsx): Google's free-tier quota is
  // scoped per model, so switching model is a real way to keep testing after
  // one is exhausted. Resolved at step.started, not session.started, because
  // a direct-provider LanguageModel object (vs. a plain gateway id string)
  // can only be returned from that scope. ctx.session.auth.current is set by
  // the onMessage hook in agent/channels/eve.ts on every inbound message, so
  // a change takes effect on the very next reply without needing a new chat.
  model: defineDynamic({
    events: {
      "step.started": (_event, ctx) => {
        const requested = ctx.session.auth.current?.attributes.model;
        const modelId = isAvailableModelId(requested)
          ? requested
          : DEFAULT_MODEL_ID;
        return google(modelId);
      },
    },
  }),
});
