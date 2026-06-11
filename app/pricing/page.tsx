import type { Metadata } from "next";
import { LicenseActivator } from "@/components/LicenseActivator";
import { PRICING } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Parse and preview statements free, always. $12 credit pack for 15 documents, or Pro at $24/month / $149/year for unlimited exports. 7-day no-questions refund.",
  alternates: { canonical: "/pricing/" },
};

const CHECKOUT_CREDITS = process.env.NEXT_PUBLIC_CHECKOUT_URL_CREDITS;
const CHECKOUT_PRO_MONTHLY = process.env.NEXT_PUBLIC_CHECKOUT_URL_PRO_MONTHLY;
const CHECKOUT_PRO_YEARLY = process.env.NEXT_PUBLIC_CHECKOUT_URL_PRO_YEARLY;

function BuyButton({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) {
    return (
      <span className="mt-6 block rounded-sm border border-rule px-4 py-2.5 text-center text-sm text-ink-soft">
        Checkout opens soon
      </span>
    );
  }
  return (
    <a
      href={href}
      className="mt-6 block rounded-sm bg-ink px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-ink/85"
    >
      {children}
    </a>
  );
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold">Pricing</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Parsing, reconciliation, and the full editable preview are free with
        no limits — you always see exactly what you&apos;d get before paying
        anything. Paying unlocks full exports.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <section className="rounded-sm border border-rule bg-surface p-6">
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="figures mt-1 text-3xl font-medium">$0</p>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            <li>Unlimited parsing & preview</li>
            <li>Reconciliation on every file</li>
            <li>All export formats</li>
            <li className="font-medium text-ink">Exports capped at 30 transactions per file</li>
          </ul>
          <span className="mt-6 block rounded-sm border border-rule px-4 py-2.5 text-center text-sm text-ink-soft">
            No sign-up — just use it
          </span>
        </section>

        <section className="rounded-sm border-2 border-ledger bg-surface p-6">
          <h2 className="text-lg font-semibold">Credit pack</h2>
          <p className="figures mt-1 text-3xl font-medium">
            {PRICING.creditPack.price}
            <span className="text-base text-ink-soft"> / {PRICING.creditPack.credits} documents</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            <li>15 full document exports</li>
            <li className="font-medium text-ink">Credits never expire</li>
            <li>No subscription</li>
            <li>License key by email, instantly</li>
          </ul>
          <BuyButton href={CHECKOUT_CREDITS}>Buy 15 credits for {PRICING.creditPack.price}</BuyButton>
        </section>

        <section className="rounded-sm border border-rule bg-surface p-6">
          <h2 className="text-lg font-semibold">Pro</h2>
          <p className="figures mt-1 text-3xl font-medium">
            {PRICING.proMonthly.price}
            <span className="text-base text-ink-soft">/month</span>
          </p>
          <p className="figures text-sm text-ink-soft">or {PRICING.proYearly.price}/year (save 48%)</p>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            <li>Unlimited exports</li>
            <li>Every format, every option</li>
            <li>Priority template support</li>
          </ul>
          <BuyButton href={CHECKOUT_PRO_MONTHLY}>Go Pro — {PRICING.proMonthly.price}/month</BuyButton>
          {CHECKOUT_PRO_YEARLY && (
            <a href={CHECKOUT_PRO_YEARLY} className="mt-2 block text-center text-sm underline">
              or {PRICING.proYearly.price}/year
            </a>
          )}
        </section>
      </div>

      <p className="mt-6 text-sm text-ink-soft">
        7-day no-questions refund on everything. Payments are handled by our
        merchant of record; we never see your card details — consistent with
        not seeing your statements either.
      </p>

      <div className="mt-12 max-w-lg">
        <h2 className="text-xl font-semibold">Already bought? Activate your key</h2>
        <LicenseActivator />
      </div>
    </div>
  );
}
