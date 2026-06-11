/**
 * Browser entry point for the anonymizer — the implementation lives in the
 * framework-free parser package so Node tooling (layout twins, validators)
 * shares the exact same sanitization rules the failure reporter uses.
 */

export {
  anonymizeLayout,
  anonymizeToken,
  type AnonymizedItem,
  type AnonymizedLayout,
} from "@parser/anonymize";
