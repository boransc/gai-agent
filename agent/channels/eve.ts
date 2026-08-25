import { eveChannel } from "eve/channels/eve";
import { localDev, none, vercelOidc } from "eve/channels/auth";
import { isAvailableModelId, MODEL_HEADER } from "../lib/models";

export default eveChannel({
  auth: [
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // Accepts everyone else anonymously.
    //
    // IMPORTANT: this performs no authentication of its own, so the agent is
    // protected only by whatever gates the deployment in front of it. This
    // demo relies on Vercel Deployment Protection at the project level; with
    // that turned off, anyone holding the URL can start sessions and spend
    // the project's model quota. `none()` also halts the auth walk, so it
    // must stay last — any entry after it would never run.
    none(),
  ],
  // Carries the browser's model choice (see agent/lib/models.ts and the
  // model picker in app/_components/agent-chat.tsx) into session-auth
  // attributes, which is the surface agent.ts's model resolver can read.
  // This runs after route auth already decided the request is allowed — it
  // only adds an attribute to that decision, never grants access itself.
  // Re-evaluated on every inbound message, not just session creation, so
  // switching models mid-conversation takes effect on the next reply.
  onMessage(ctx) {
    const caller = ctx.eve.caller;
    if (!caller) return { auth: caller };

    const requested = ctx.eve.request.headers.get(MODEL_HEADER);
    if (!isAvailableModelId(requested)) return { auth: caller };

    return {
      auth: {
        ...caller,
        attributes: { ...caller.attributes, model: requested },
      },
    };
  },
});
