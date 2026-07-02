import { describe, expect, test } from "vitest";
import { APP_NAME, APP_SLOGAN } from "@/lib/brand";

describe("brand copy", () => {
  test("uses the PancakeHub product name", () => {
    expect(APP_NAME).toBe("PancakeHub");
  });

  test("uses a professional workflow slogan", () => {
    expect(APP_SLOGAN).toBe("摄影协作与交付工作台");
  });
});
