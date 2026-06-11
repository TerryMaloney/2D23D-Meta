/**
 * Cloudflare Pages Function: POST /api/license/consume
 *
 * Spends one credit on a credit-pack license key by validating with
 * increment_usage: 1 against Polar. Pro keys are a no-op.
 */

interface Env {
  POLAR_ORGANIZATION_ID?: string;
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
    return json({ ok: false }, 400);
  }
  const orgId = context.env.POLAR_ORGANIZATION_ID;
  if (!key || !orgId) return json({ ok: false }, 400);

  try {
    const res = await fetch(POLAR_VALIDATE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, organization_id: orgId, increment_usage: 1 }),
    });
    const data = (await res.json()) as { usage?: number; limit_usage?: number | null };
    const remaining =
      data.limit_usage != null ? Math.max(0, data.limit_usage - (data.usage ?? 0)) : undefined;
    return json({ ok: res.ok, creditsRemaining: remaining });
  } catch {
    return json({ ok: false }, 502);
  }
};
