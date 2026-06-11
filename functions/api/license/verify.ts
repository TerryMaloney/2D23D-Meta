/**
 * Cloudflare Pages Function: POST /api/license/verify
 *
 * Proxies Polar's license-key validation. This is the ONLY server-side code
 * in the product, and it never sees statement files — it receives a license
 * key string and returns a plan.
 *
 * Environment variables (set in the Cloudflare Pages project):
 * - POLAR_ORGANIZATION_ID  — your Polar organization ID
 *
 * Plan mapping: keys with a usage limit are credit packs (remaining =
 * limit - usage); keys without a limit are Pro subscriptions.
 */

interface Env {
  POLAR_ORGANIZATION_ID?: string;
}

interface PolarLicenseKey {
  status?: string;
  usage?: number;
  limit_usage?: number | null;
  expires_at?: string | null;
}

const POLAR_VALIDATE = "https://api.polar.sh/v1/customer-portal/license-keys/validate";

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  let key: string;
  try {
    const body = (await context.request.json()) as { key?: string };
    key = (body.key ?? "").trim();
  } catch {
    return json({ valid: false, error: "Bad request." }, 400);
  }
  if (!key || key.length > 200) {
    return json({ valid: false, error: "Enter a license key." }, 400);
  }

  const orgId = context.env.POLAR_ORGANIZATION_ID;
  if (!orgId) {
    return json(
      { valid: false, error: "Licensing isn't configured yet. Email support@statementclear.com." },
      503,
    );
  }

  try {
    const res = await fetch(POLAR_VALIDATE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, organization_id: orgId }),
    });
    if (res.status === 404) {
      return json({ valid: false, error: "That key isn't valid. Check for typos and try again." });
    }
    if (!res.ok) {
      return json({ valid: false, error: "License server error. Try again in a minute." }, 502);
    }
    const data = (await res.json()) as PolarLicenseKey;
    if (data.status && data.status !== "granted") {
      return json({ valid: false, error: "This key has been revoked or has expired." });
    }
    if (data.limit_usage != null) {
      const remaining = Math.max(0, data.limit_usage - (data.usage ?? 0));
      return json({ valid: remaining > 0, plan: "credits", creditsRemaining: remaining, ...(remaining === 0 ? { error: "This credit pack is used up." } : {}) });
    }
    return json({ valid: true, plan: "pro" });
  } catch {
    return json({ valid: false, error: "Couldn't reach the license provider." }, 502);
  }
};
