/**
 * Adversarial fixtures: scanned, password-protected, and non-statement PDFs
 * must produce the right typed errors with actionable copy.
 */

import { describe, it, expect } from "vitest";
import { parseStatement } from "@parser/parse";
import { StatementParseError } from "@parser/types";
import { passwordError } from "@parser/extract";
import { fixturePdf, loadRawPages } from "./harness";

describe("adversarial fixtures", () => {
  it("detects scanned (image-only) PDFs", async () => {
    const pages = await loadRawPages(fixturePdf("scanned"));
    try {
      parseStatement(pages);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(StatementParseError);
      expect((e as StatementParseError).code).toBe("SCANNED_PDF");
      expect((e as StatementParseError).message).toContain("digital PDFs");
    }
  });

  it("rejects password-protected PDFs at open time", async () => {
    // pdf.js throws a PasswordException; the client maps it to our typed
    // error. The same mapping is exercised here.
    let thrown: unknown;
    try {
      await loadRawPages(fixturePdf("password-protected"));
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
    expect((thrown as { name?: string }).name).toBe("PasswordException");

    const mapped = passwordError();
    expect(mapped.code).toBe("PASSWORD_PROTECTED");
    expect(mapped.message).toContain("password");
  });

  it("opens password-protected PDFs when the password is supplied", async () => {
    const pages = await loadRawPages(fixturePdf("password-protected"), "hunter2");
    const output = parseStatement(pages);
    expect(output.statements[0].transactions.length).toBeGreaterThan(0);
  });

  it("rejects PDFs that are not statements", async () => {
    const pages = await loadRawPages(fixturePdf("non-statement"));
    try {
      parseStatement(pages);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(StatementParseError);
      expect((e as StatementParseError).code).toBe("NOT_A_STATEMENT");
    }
  });
});
