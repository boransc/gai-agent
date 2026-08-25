import type {
  BusinessConfig,
  Enquiry,
  Quote,
  QuoteLineItem,
  ServiceDefinition,
} from "./types";

/** Money is rounded to the penny at every step so totals always reconcile. */
function money(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function findService(
  serviceId: string,
  config: BusinessConfig,
): ServiceDefinition | undefined {
  return config.services.find((service) => service.id === serviceId);
}

function serviceChargeLine(service: ServiceDefinition): QuoteLineItem {
  if (service.pricingModel === "flat") {
    if (service.flatRate === undefined) {
      throw new Error(
        `Service "${service.id}" is priced flat but has no flatRate configured.`,
      );
    }
    return { label: `${service.name} — labour`, amount: money(service.flatRate) };
  }

  if (service.estimatedHours === undefined || service.hourlyRate === undefined) {
    throw new Error(
      `Service "${service.id}" is time-based but is missing estimatedHours or hourlyRate.`,
    );
  }
  return {
    label: `${service.name} — labour`,
    amount: money(service.estimatedHours * service.hourlyRate),
    note: `${service.estimatedHours} hr estimated at £${service.hourlyRate}/hr`,
  };
}

/**
 * Tool 2 of 3. Applies the configured pricing rules and nothing else — every
 * figure below traces back to a field on BusinessConfig or to the measured
 * distance. Callers must have already established that the postcode is in
 * area and that the required enquiry fields are present.
 */
export function calculateQuote(
  enquiry: Enquiry,
  distanceMiles: number,
  config: BusinessConfig,
): Quote {
  const service = enquiry.serviceId
    ? findService(enquiry.serviceId, config)
    : undefined;
  if (!service) {
    throw new Error(
      `calculateQuote called with unknown serviceId "${enquiry.serviceId}".`,
    );
  }

  const lineItems: QuoteLineItem[] = [
    { label: "Call-out fee", amount: money(config.callOutFee) },
    serviceChargeLine(service),
  ];

  if (service.partsEstimateRange) {
    const [low, high] = service.partsEstimateRange;
    lineItems.push({
      label: "Parts (estimate)",
      amount: money(low),
      amountMax: money(high),
      note: "Confirmed once the mechanic has seen the vehicle.",
    });
  }

  const chargeableMiles = Math.max(0, distanceMiles - config.freeRadiusMiles);
  if (chargeableMiles > 0) {
    lineItems.push({
      label: "Distance surcharge",
      amount: money(chargeableMiles * config.distanceSurchargePerMile),
      note: `${chargeableMiles.toFixed(1)} miles beyond the ${config.freeRadiusMiles}-mile free radius at £${config.distanceSurchargePerMile}/mile`,
    });
  }

  const subtotal = money(
    lineItems.reduce((sum, item) => sum + item.amount, 0),
  );
  const subtotalMax = money(
    lineItems.reduce((sum, item) => sum + (item.amountMax ?? item.amount), 0),
  );

  const vat =
    config.vatApplicable && config.vatRate !== undefined
      ? {
          rate: config.vatRate,
          amount: money(subtotal * config.vatRate),
          amountMax: money(subtotalMax * config.vatRate),
        }
      : undefined;

  const isEstimate = lineItems.some((item) => item.amountMax !== undefined);

  const disclaimers: string[] = [];
  if (isEstimate) {
    disclaimers.push(
      "This is an estimate. Parts costs are confirmed on inspection.",
    );
  }
  if (service.pricingModel === "time-based") {
    disclaimers.push(
      "Diagnostic time is estimated. Any repair is quoted separately once the fault is known.",
    );
  }

  return {
    currency: config.currency,
    serviceId: service.id,
    serviceName: service.name,
    lineItems,
    subtotal,
    subtotalMax,
    vat,
    total: money(subtotal + (vat?.amount ?? 0)),
    totalMax: money(subtotalMax + (vat?.amountMax ?? 0)),
    isEstimate,
    disclaimers,
    distanceMiles,
  };
}
