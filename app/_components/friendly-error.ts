/**
 * Turns a raw failure into something a customer can act on.
 *
 * Provider and framework errors are written for whoever is running the agent,
 * not for the person trying to book a mechanic. Left alone they surface things
 * like "You exceeded your current quota, please check your plan and billing
 * details" or "Replace placeholderAuth() in agent/channels/eve.ts" — the first
 * is meaningless to a customer, the second leaks internal configuration into
 * the browser.
 *
 * Every branch below matches on wording seen in real failures from this
 * project. Anything unrecognised falls back to a generic message rather than
 * being shown verbatim, so a new provider error can't leak through.
 */

export interface FriendlyError {
  title: string;
  detail: string;
  /** Whether trying the same message again is likely to help. */
  retryable: boolean;
}

const GENERIC: FriendlyError = {
  title: "Something went wrong",
  detail:
    "We couldn't get that through just now. Please try again in a moment — if it keeps happening, give us a ring instead.",
  retryable: true,
};

export function toFriendlyError(raw: string | undefined): FriendlyError | undefined {
  if (raw === undefined) return undefined;

  const text = raw.toLowerCase();

  // Free-tier request cap. Nothing the customer can do about it.
  if (text.includes("quota") || text.includes("rate limit") || text.includes("429")) {
    return {
      title: "We're at capacity",
      detail:
        "Our assistant has hit its limit for now. Please try again shortly, or call us and we'll quote you directly.",
      retryable: true,
    };
  }

  // Provider-side capacity shedding — transient and genuinely worth retrying.
  if (text.includes("high demand") || text.includes("overloaded") || text.includes("unavailable")) {
    return {
      title: "Busy right now",
      detail:
        "The assistant is briefly overloaded. Give it a few seconds and send your message again.",
      retryable: true,
    };
  }

  // Misconfiguration: auth, missing credentials, a bad or retired model id.
  // Deliberately vague — these messages name internal files and settings.
  if (
    text.includes("auth") ||
    text.includes("credential") ||
    text.includes("api key") ||
    text.includes("no longer available") ||
    text.includes("not found") ||
    text.includes("permission")
  ) {
    return {
      title: "The assistant is unavailable",
      detail:
        "Something needs fixing on our side, so it isn't you. Please call us and we'll sort your quote out over the phone.",
      retryable: false,
    };
  }

  if (text.includes("cancel")) {
    return {
      title: "Stopped",
      detail: "That response was cancelled. Send another message whenever you're ready.",
      retryable: true,
    };
  }

  if (text.includes("timeout") || text.includes("timed out") || text.includes("network")) {
    return {
      title: "Connection dropped",
      detail: "We lost the connection partway through. Check your signal and try again.",
      retryable: true,
    };
  }

  return GENERIC;
}
