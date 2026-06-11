/**
 * Deterministic FNV-1a 64-bit hash, hex-encoded. Shared by the exporters
 * (FITID generation) and the audit engine (statement signatures).
 */
export function fnv1a64(input: string): string {
  let hi = 0xcbf29ce4;
  let lo = 0x84222325;
  for (let i = 0; i < input.length; i++) {
    lo ^= input.charCodeAt(i);
    // 64-bit multiply by FNV prime 0x100000001b3, split into 32-bit halves.
    const newLo = (lo & 0xffff) * 0x1b3 + (((lo >>> 16) * 0x1b3) << 16);
    hi = (hi * 0x1b3 + Math.floor(lo / 0x10000) * 0x100 + (newLo > 0xffffffff ? 1 : 0)) >>> 0;
    lo = newLo >>> 0;
    hi = (hi + lo * 0x100) >>> 0; // fold the 2^32 carry of the prime's high bit
  }
  return hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0");
}
