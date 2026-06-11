"use client";

/**
 * Export modal: format choice + per-format options, free-cap gating, and
 * license entry. Buttons say what they do.
 */

import { useEffect, useState } from "react";
import type { ParsedStatement } from "@parser/types";
import { toCsv, toOfx, toXeroCsv, toXlsxBytes, DateStyle, OfxFlavor } from "@exporters";
import { beacon } from "@/lib/beacon";
import { downloadBytes } from "@/lib/download";
import {
  canExport,
  consumeCredit,
  LicenseState,
  loadLicense,
  saveLicense,
  TEST_MODE,
  verifyKey,
} from "@/lib/license";
import { FREE_EXPORT_CAP, PRICING } from "@/lib/site";

type Format = "csv" | "xlsx" | "qbo" | "qfx" | "ofx" | "xero";

const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: "csv", label: "CSV", hint: "opens in Excel, Sheets, anything" },
  { id: "xlsx", label: "Excel (XLSX)", hint: "typed dates & amounts" },
  { id: "qbo", label: "QBO", hint: "QuickBooks Web Connect" },
  { id: "qfx", label: "QFX", hint: "Quicken" },
  { id: "ofx", label: "OFX", hint: "Xero, Wave, GnuCash…" },
  { id: "xero", label: "Xero CSV", hint: "precoded statement layout" },
];

export function ExportModal({
  statement,
  fileBase,
  onClose,
}: {
  statement: ParsedStatement;
  fileBase: string;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<Format>("csv");
  const [dateStyle, setDateStyle] = useState<DateStyle>("MM/DD/YYYY");
  const [signStyle, setSignStyle] = useState<"signed" | "debit-credit">("signed");
  const [includeBalance, setIncludeBalance] = useState(true);
  const [accountType, setAccountType] = useState<"CHECKING" | "SAVINGS" | "CREDITCARD">(
    statement.accountType === "credit-card" ? "CREDITCARD" : "CHECKING",
  );
  const [invertSigns, setInvertSigns] = useState(statement.accountType === "credit-card");
  const [intuBid, setIntuBid] = useState("3000");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [license, setLicense] = useState<LicenseState>({ plan: "free" });
  const [keyDraft, setKeyDraft] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setLicense(loadLicense()), []);

  const n = statement.transactions.length;
  const allowed = canExport(license, n, FREE_EXPORT_CAP);
  const overCap = n > FREE_EXPORT_CAP;

  useEffect(() => {
    if (!allowed) beacon({ event: "paywall_hit" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const doExport = async (capped: boolean) => {
    setBusy(true);
    try {
      const source = capped
        ? { ...statement, transactions: statement.transactions.slice(0, FREE_EXPORT_CAP) }
        : statement;
      const name = `${fileBase}${capped ? `-first-${FREE_EXPORT_CAP}` : ""}`;
      switch (format) {
        case "csv":
          downloadBytes(`${name}.csv`, toCsv(source, { dateStyle, signStyle, includeBalance }), "text/csv");
          break;
        case "xero":
          downloadBytes(`${name}-xero.csv`, toXeroCsv(source, { dateStyle }), "text/csv");
          break;
        case "xlsx":
          downloadBytes(
            `${name}.xlsx`,
            toXlsxBytes(source),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          );
          break;
        default: {
          const flavor: OfxFlavor = format;
          downloadBytes(
            `${name}.${format}`,
            toOfx(source, {
              flavor,
              accountType,
              invertSigns,
              intuBid,
              accountId: statement.accountId?.replace(/\D/g, "") || "0000",
            }),
            "application/x-ofx",
          );
        }
      }
      beacon({ event: "export", format });
      if (!capped && license.plan === "credits") {
        setLicense(await consumeCredit(license));
      }
    } finally {
      setBusy(false);
    }
  };

  const submitKey = async () => {
    setKeyError(null);
    const result = await verifyKey(keyDraft);
    if (result.ok && result.state) {
      setLicense(result.state);
      saveLicense(result.state);
    } else {
      setKeyError(result.error ?? "That key isn't valid.");
    }
  };

  const isOfxFamily = format === "qbo" || format === "qfx" || format === "ofx";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export options"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-sm border border-rule bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">Export</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="rounded-sm px-2 py-1 text-ink-soft hover:bg-background"
          >
            ✕
          </button>
        </div>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Format
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FORMATS.map((f) => (
              <label
                key={f.id}
                className={`cursor-pointer rounded-sm border px-3 py-2 text-sm ${
                  format === f.id ? "border-ink bg-ledger-wash" : "border-rule hover:border-rule-strong"
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={f.id}
                  checked={format === f.id}
                  onChange={() => setFormat(f.id)}
                  className="sr-only"
                />
                <span className="font-medium">{f.label}</span>
                <span className="block text-[11px] text-ink-soft">{f.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {(format === "csv" || format === "xero") && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              Date format
              <select
                value={dateStyle}
                onChange={(e) => setDateStyle(e.target.value as DateStyle)}
                className="rounded-sm border border-rule px-2 py-1"
              >
                <option>MM/DD/YYYY</option>
                <option>DD/MM/YYYY</option>
                <option value="ISO">ISO (YYYY-MM-DD)</option>
              </select>
            </label>
            {format === "csv" && (
              <>
                <label className="flex items-center gap-2">
                  Amounts
                  <select
                    value={signStyle}
                    onChange={(e) => setSignStyle(e.target.value as "signed" | "debit-credit")}
                    className="rounded-sm border border-rule px-2 py-1"
                  >
                    <option value="signed">One signed column</option>
                    <option value="debit-credit">Debit / credit columns</option>
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeBalance}
                    onChange={(e) => setIncludeBalance(e.target.checked)}
                  />
                  Include balance column
                </label>
              </>
            )}
          </div>
        )}

        {isOfxFamily && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                Account type
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as typeof accountType)}
                  className="rounded-sm border border-rule px-2 py-1"
                >
                  <option value="CHECKING">Checking</option>
                  <option value="SAVINGS">Savings</option>
                  <option value="CREDITCARD">Credit card</option>
                </select>
              </label>
              <label className="flex items-center gap-2" title="Credit-card statements print purchases as positive; most tools expect charges as negative.">
                <input
                  type="checkbox"
                  checked={invertSigns}
                  onChange={(e) => setInvertSigns(e.target.checked)}
                />
                Flip signs (credit cards)
              </label>
            </div>
            <button
              type="button"
              className="text-xs text-ink-soft underline"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? "Hide" : "Show"} advanced settings
            </button>
            {showAdvanced && (
              <label className="flex items-center gap-2">
                INTU.BID
                <input
                  value={intuBid}
                  onChange={(e) => setIntuBid(e.target.value)}
                  className="figures w-24 rounded-sm border border-rule px-2 py-1"
                />
                <span className="text-[11px] text-ink-soft">
                  Import fails in QuickBooks? Try your bank&apos;s BID.
                </span>
              </label>
            )}
          </div>
        )}

        {allowed ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => doExport(false)}
            className="mt-5 w-full rounded-sm bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink/85 disabled:opacity-50"
          >
            Export {n} transaction{n === 1 ? "" : "s"} as {FORMATS.find((f) => f.id === format)!.label}
          </button>
        ) : (
          <div className="mt-5 rounded-sm border border-rule bg-background p-4 text-sm">
            <p className="font-medium">
              This statement has {n} transactions — the free plan exports up to{" "}
              {FREE_EXPORT_CAP} per file.
            </p>
            <p className="mt-1 text-ink-soft">
              The full preview above is free, always. To export everything:{" "}
              a credit pack ({PRICING.creditPack.price} → {PRICING.creditPack.credits}{" "}
              documents, never expires) or Pro ({PRICING.proMonthly.price}/month,
              unlimited).
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="/pricing/"
                onClick={() => beacon({ event: "purchase_click" })}
                className="rounded-sm bg-ledger px-3 py-2 font-medium text-white hover:bg-ledger-deep"
              >
                See pricing
              </a>
              <button
                type="button"
                onClick={() => doExport(true)}
                className="rounded-sm border border-rule px-3 py-2 hover:border-rule-strong"
              >
                Export first {FREE_EXPORT_CAP} only
              </button>
            </div>
            <div className="mt-4 border-t border-rule pt-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Already have a license key?
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder={TEST_MODE ? "DEV-UNLOCK" : "STMT-XXXX-XXXX-XXXX"}
                  className="figures flex-1 rounded-sm border border-rule px-2 py-1.5"
                  aria-label="License key"
                />
                <button
                  type="button"
                  onClick={submitKey}
                  className="rounded-sm border border-ink px-3 py-1.5 font-medium hover:bg-ink hover:text-white"
                >
                  Activate
                </button>
              </div>
              {keyError && <p className="mt-1.5 text-xs text-negative">{keyError}</p>}
            </div>
          </div>
        )}

        {allowed && license.plan === "credits" && (
          <p className="figures mt-2 text-center text-xs text-ink-soft">
            {license.creditsRemaining} export credit
            {license.creditsRemaining === 1 ? "" : "s"} remaining — this export uses 1.
          </p>
        )}
        {allowed && license.plan === "pro" && (
          <p className="mt-2 text-center text-xs text-ink-soft">Pro — unlimited exports.</p>
        )}
      </div>
    </div>
  );
}
