import { AlertCircleIcon, CheckCircle2Icon, InfoIcon } from "lucide-react";

/**
 * The customer-facing payload returned by the check_job_eligibility tool.
 * Mirrored rather than imported so this component stays a pure view over
 * whatever the tool actually sent, and can reject anything malformed.
 */
export type QuoteLine = {
  label: string;
  amount: number;
  amountMax?: number;
  note?: string;
};

export type QuoteCardPayload = {
  status: "accepted" | "needs_human_review";
  quote: {
    currency: string;
    service: string;
    location: string;
    distanceMiles: number;
    lineItems: QuoteLine[];
    total: number;
    totalMax: number;
    isEstimate: boolean;
    vat: { rate: number; amount: number; amountMax: number } | null;
    disclaimers: string[];
  };
  customerExplanations: string[];
};

/**
 * Tool output arrives as `unknown`, so validate the shape we actually depend on
 * before rendering. Anything unexpected falls back to the generic tool view.
 */
export function isQuoteCardPayload(value: unknown): value is QuoteCardPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<QuoteCardPayload>;
  if (
    candidate.status !== "accepted" &&
    candidate.status !== "needs_human_review"
  ) {
    return false;
  }
  const quote = candidate.quote;
  return (
    typeof quote === "object" &&
    quote !== null &&
    Array.isArray(quote.lineItems) &&
    typeof quote.total === "number"
  );
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

/** A range collapses to a single figure when both ends match. */
function formatRange(low: number, high: number, currency: string) {
  return high > low
    ? `${formatMoney(low, currency)}–${formatMoney(high, currency)}`
    : formatMoney(low, currency);
}

export function QuoteCard({ payload }: { readonly payload: QuoteCardPayload }) {
  const { quote, status, customerExplanations } = payload;
  const { currency } = quote;
  const needsReview = status === "needs_human_review";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Quote</p>
          <p className="font-medium">{quote.service}</p>
        </div>
        {quote.isEstimate ? (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Estimate
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Fixed price
          </span>
        )}
      </div>

      <dl className="divide-y divide-border">
        {quote.lineItems.map((line) => (
          <div key={line.label} className="flex gap-4 px-4 py-2.5">
            <dt className="flex-1">
              <span className="text-sm">{line.label}</span>
              {line.note ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {line.note}
                </span>
              ) : null}
            </dt>
            <dd className="shrink-0 text-sm tabular-nums">
              {formatRange(line.amount, line.amountMax ?? line.amount, currency)}
            </dd>
          </div>
        ))}

        {quote.vat ? (
          <div className="flex gap-4 px-4 py-2.5">
            <dt className="flex-1 text-sm">
              VAT
              <span className="ml-1 text-xs text-muted-foreground">
                at {Math.round(quote.vat.rate * 100)}%
              </span>
            </dt>
            <dd className="shrink-0 text-sm tabular-nums">
              {formatRange(quote.vat.amount, quote.vat.amountMax, currency)}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="flex items-baseline justify-between gap-4 border-t border-border bg-muted/40 px-4 py-3">
        <span className="text-sm font-medium">Total</span>
        <span className="text-lg font-semibold tabular-nums">
          {formatRange(quote.total, quote.totalMax, currency)}
        </span>
      </div>

      {needsReview && customerExplanations.length > 0 ? (
        <div className="flex gap-2.5 border-t border-border bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
          <div className="space-y-1 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-medium">We&apos;ll confirm this with you first</p>
            {customerExplanations.map((explanation) => (
              <p key={explanation}>{explanation}</p>
            ))}
          </div>
        </div>
      ) : null}

      {!needsReview ? (
        <div className="flex items-center gap-2.5 border-t border-border px-4 py-2.5 text-sm text-muted-foreground">
          <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
          <span>We can take this job on.</span>
        </div>
      ) : null}

      {quote.disclaimers.length > 0 ? (
        <div className="space-y-1 border-t border-border px-4 py-2.5">
          {quote.disclaimers.map((disclaimer) => (
            <p
              key={disclaimer}
              className="flex gap-2 text-xs text-muted-foreground"
            >
              <InfoIcon className="mt-0.5 size-3 shrink-0" />
              <span>{disclaimer}</span>
            </p>
          ))}
        </div>
      ) : null}

      <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        {quote.location} · {quote.distanceMiles} miles from base
      </p>
    </div>
  );
}
