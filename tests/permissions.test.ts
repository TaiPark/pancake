import { describe, expect, test } from "vitest";
import { slugify, makeInviteCode } from "@/lib/slug";

describe("group helpers", () => {
  test("creates stable URL slugs from group names", () => {
    expect(slugify("夜色 胶片 小组")).toBe("夜色-胶片-小组");
    expect(slugify("  Dark Room Club  ")).toBe("dark-room-club");
  });

  test("creates short uppercase invite codes", () => {
    expect(makeInviteCode("12345678-aaaa-bbbb-cccc-1234567890ab")).toBe("12345678");
  });
});
