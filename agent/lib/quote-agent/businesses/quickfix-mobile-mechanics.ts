import type { BusinessConfig } from "../types";

/**
 * Demo business for the prototype. Swapping this object for another
 * BusinessConfig is the only change needed to point QuoteAgent at a
 * different service business — no tool or pipeline code is business-specific.
 */
export const quickfixMobileMechanics: BusinessConfig = {
  businessName: "QuickFix Mobile Mechanics",
  currency: "GBP",

  basePostcode: "CR0 1AA",
  serviceRadiusMiles: 15,
  freeRadiusMiles: 10,
  distanceSurchargePerMile: 1.5,

  callOutFee: 35,
  // Set above the £100 diagnostics-only total so the rule is live: a job worth
  // less than a typical repair visit gets a human's eyes before it's booked.
  minimumJobValue: 120,

  // A solo mobile mechanic below the VAT threshold. The schema supports VAT
  // (see vatRate) so a larger business can switch it on without code changes.
  vatApplicable: false,

  services: [
    {
      id: "battery-replacement",
      name: "Battery replacement",
      description: "Supply and fit a replacement car battery.",
      pricingModel: "flat",
      flatRate: 80,
      partsEstimateRange: [50, 90],
      faultDescriptionRequired: false,
    },
    {
      id: "brake-pad-replacement",
      name: "Brake pad replacement",
      description: "Replace front or rear brake pads.",
      pricingModel: "flat",
      flatRate: 120,
      partsEstimateRange: [40, 120],
      faultDescriptionRequired: false,
    },
    {
      id: "tyre-replacement",
      name: "Tyre replacement (single)",
      description: "Supply and fit one replacement tyre.",
      pricingModel: "flat",
      flatRate: 60,
      partsEstimateRange: [45, 150],
      faultDescriptionRequired: false,
    },
    {
      id: "wont-start-diagnostics",
      name: "Won't start / diagnostics",
      description:
        "Diagnose why the vehicle won't start. Repair quoted separately once the fault is known.",
      pricingModel: "time-based",
      estimatedHours: 1,
      hourlyRate: 65,
      faultDescriptionRequired: true,
    },
    {
      id: "strange-noise-diagnostics",
      name: "Strange noise / diagnostics",
      description:
        "Investigate an unfamiliar noise. Repair quoted separately once the fault is known.",
      pricingModel: "time-based",
      estimatedHours: 1,
      hourlyRate: 65,
      faultDescriptionRequired: true,
    },
  ],

  reviewRules: [
    {
      id: "high-value",
      condition: { kind: "jobValueAbove", amount: 400 },
      reason: "High-value job — confirm scope and parts with the customer before booking.",
      customerExplanation:
        "Because of the size of this job, one of our mechanics will go through the details with you before we book it in.",
    },
    {
      id: "below-minimum",
      condition: { kind: "jobValueBelowMinimum" },
      reason: "Job is priced below the minimum job value.",
      customerExplanation:
        "We'll give you a quick call to check the best way to help with this one before booking anything in.",
    },
    {
      id: "borderline-area",
      condition: { kind: "borderlineServiceArea" },
      reason: "Borderline service area — confirm travel is worthwhile before dispatch.",
      customerExplanation:
        "You're near the edge of the area we cover, so we'll confirm we can get to you before booking.",
    },
    {
      id: "safety-critical-service",
      condition: { kind: "serviceIn", serviceIds: ["brake-pad-replacement"] },
      reason:
        "Brake work is safety-critical — a mechanic confirms the job before it is booked.",
      customerExplanation:
        "Because this is brake work, one of our mechanics will confirm the details with you before we book it in.",
    },
    {
      id: "safety-critical",
      condition: {
        kind: "faultDescriptionMatches",
        pattern: "brake|smoke|steering|accident|airbag",
        flags: "i",
      },
      reason:
        "Fault description mentions a safety-critical symptom — a mechanic should speak to the customer directly.",
      customerExplanation:
        "From what you've described, one of our mechanics would like to speak with you directly before we book anything in.",
    },
  ],

  requiredEnquiryFields: ["postcode", "serviceId", "vehicleMake", "vehicleModel"],
};
