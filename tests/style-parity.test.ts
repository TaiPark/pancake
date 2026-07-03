import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage style parity", () => {
  it("carries the homepage glow shell into auth pages", () => {
    const login = readFileSync("app/login/page.tsx", "utf8");
    const signup = readFileSync("app/signup/page.tsx", "utf8");

    expect(login).toContain("BorderGlow");
    expect(signup).toContain("BorderGlow");
    expect(login).toContain("auth-proof-card");
    expect(signup).toContain("auth-proof-card");
  });

  it("uses the same glow shell for app page hero panels", () => {
    const groups = readFileSync("app/app/groups/page.tsx", "utf8");
    const group = readFileSync("app/app/groups/[groupId]/page.tsx", "utf8");
    const session = readFileSync("app/app/groups/[groupId]/sessions/[sessionId]/page.tsx", "utf8");

    expect(groups).toContain("BorderGlow");
    expect(group).toContain("BorderGlow");
    expect(session).toContain("BorderGlow");
    expect(groups).toContain("studio-metric");
    expect(group).toContain("studio-metric");
    expect(session).toContain("studio-metric");
  });

  it("softens app surfaces to match the homepage material system", () => {
    const shell = readFileSync("components/AppShell.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    expect(shell).not.toContain("border-b border-white/10");
    expect(css).toContain(".studio-card");
    expect(css).toContain(".auth-proof-card");
    expect(css).toContain(".studio-metric");
  });
});
