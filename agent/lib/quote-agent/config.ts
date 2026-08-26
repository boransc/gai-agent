import type { BusinessConfig } from "./types";
import { quickfixMobileMechanics } from "./businesses/quickfix-mobile-mechanics";
import { assertValidBusinessConfig } from "./validate-config";

/**
 * The business this deployment is quoting for. Point this at a different
 * BusinessConfig to run QuoteAgent for another service business — no tool or
 * pricing code is specific to mobile mechanics.
 */
export const activeBusiness: BusinessConfig = quickfixMobileMechanics;

// Fails at load time rather than on whichever customer first triggers the
// misconfiguration — see validate-config.ts for what's checked and why.
assertValidBusinessConfig(activeBusiness);
