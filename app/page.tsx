import Link from "next/link";
import { activeBusiness } from "@/agent/lib/quote-agent/config";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-2xl">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          QuoteAgent
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {activeBusiness.businessName}
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-300">
          Tell us where the vehicle is and what it&apos;s doing, and you&apos;ll
          get an itemised quote in a couple of minutes. We cover{" "}
          {activeBusiness.serviceRadiusMiles} miles around{" "}
          {activeBusiness.basePostcode}.
        </p>

        <Link
          href="/s"
          className="mt-8 inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Start an enquiry
        </Link>

        <h2 className="mt-12 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          What we do
        </h2>
        <ul className="mt-3 divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {activeBusiness.services.map((service) => (
            <li
              key={service.id}
              className="flex items-baseline justify-between gap-4 py-3"
            >
              <span className="text-zinc-900 dark:text-zinc-100">
                {service.name}
              </span>
              <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                {service.pricingModel === "flat"
                  ? `from ${currency.format((service.flatRate ?? 0) + activeBusiness.callOutFee)}`
                  : `${currency.format(service.hourlyRate ?? 0)}/hr`}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Prices include the {currency.format(activeBusiness.callOutFee)}{" "}
          call-out fee and exclude parts. Every quote is confirmed against your
          vehicle and location before it&apos;s booked.
        </p>
      </main>
    </div>
  );
}
