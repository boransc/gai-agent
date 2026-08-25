/**
 * Google model ids the chat UI may request, and the wiring that carries a
 * choice from the browser to agent.ts's model resolver.
 *
 * The id list is copied from the `GoogleModelId` union in the installed
 * @ai-sdk/google types (node_modules/@ai-sdk/google/dist/index.d.ts) — every
 * entry here is a real, currently-valid id for this provider version. None of
 * these have been called against the live API to confirm free-tier
 * availability: Google scopes quota per model, so a model that looks fine in
 * the type union can still be exhausted, rate-limited, or (like
 * gemini-2.5-flash was here) retired for new callers. That's the whole reason
 * this is user-selectable rather than fixed.
 */
export const AVAILABLE_MODELS = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
] as const;

export type AvailableModelId = (typeof AVAILABLE_MODELS)[number]["id"];

export const DEFAULT_MODEL_ID: AvailableModelId = "gemini-3.5-flash";

/**
 * Header the browser sends its model choice on. Read server-side in
 * agent/channels/eve.ts and merged into the request's session-auth
 * attributes, which is the only channel eve exposes for getting
 * client-supplied data into a model resolver (see agent/agent.ts).
 */
export const MODEL_HEADER = "x-quote-agent-model";

/**
 * Never hand a client-supplied string straight to the model provider: this is
 * the one gate that keeps an arbitrary header value from reaching `google()`.
 */
export function isAvailableModelId(value: unknown): value is AvailableModelId {
  return (
    typeof value === "string" &&
    AVAILABLE_MODELS.some((model) => model.id === value)
  );
}
