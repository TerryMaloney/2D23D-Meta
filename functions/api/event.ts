/**
 * Cloudflare Pages Function: POST /api/event — the internal event beacon.
 *
 * PRIVACY RESTRICTION: payloads contain only event enums and numbers (see
 * lib/beacon.ts). This endpoint must never log or store anything derived
 * from file contents — it can't, because the client never sends any.
 *
 * Wiring to Workers Analytics Engine (optional, free):
 *   1. In the Pages project, add an Analytics Engine binding named EVENTS.
 *   2. Uncomment the writeDataPoint call below.
 */

interface Env {
  EVENTS?: {
    writeDataPoint(point: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void;
  };
}

const ALLOWED = new Set([
  "parse_attempt",
  "parse_success",
  "parse_failed",
  "reconciliation",
  "export",
  "paywall_hit",
  "purchase_click",
]);

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  try {
    const body = (await context.request.json()) as Record<string, unknown>;
    const event = String(body.event ?? "");
    if (ALLOWED.has(event)) {
      context.env.EVENTS?.writeDataPoint({
        indexes: [event],
        blobs: [
          String(body.template ?? body.errorType ?? body.status ?? body.format ?? ""),
        ],
        doubles: [Number(body.durationMs ?? 0)],
      });
    }
  } catch {
    /* never error toward the client */
  }
  return new Response(null, { status: 204 });
};
