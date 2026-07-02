import { describe, expect, test } from "vitest";
import { REGISTRATION_INVITE_CODE, validateRegistrationInvite } from "@/lib/invite";

describe("registration invite gate", () => {
  test("accepts the configured invite code case-insensitively", () => {
    expect(REGISTRATION_INVITE_CODE).toBe("BILIGO");
    expect(validateRegistrationInvite("biligo")).toBe(true);
    expect(validateRegistrationInvite(" BILIGO ")).toBe(true);
  });

  test("rejects missing or incorrect invite codes", () => {
    expect(validateRegistrationInvite("")).toBe(false);
    expect(validateRegistrationInvite("PANCAKE1")).toBe(false);
  });
});
