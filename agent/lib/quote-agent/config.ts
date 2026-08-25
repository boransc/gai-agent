import type { BusinessConfig } from "./types";
import { quickfixMobileMechanics } from "./businesses/quickfix-mobile-mechanics";

/**
 * The business this deployment is quoting for. Point this at a different
 * BusinessConfig to run QuoteAgent for another service business — no tool or
 * pricing code is specific to mobile mechanics.
 */
export const activeBusiness: BusinessConfig = quickfixMobileMechanics;
