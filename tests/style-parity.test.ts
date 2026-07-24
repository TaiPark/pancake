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

  it("keeps glow emphasis limited to compact app headers", () => {
    const groups = readFileSync("app/app/groups/page.tsx", "utf8");
    const group = readFileSync("app/app/groups/[groupId]/page.tsx", "utf8");
    const session = readFileSync("app/app/groups/[groupId]/sessions/[sessionId]/page.tsx", "utf8");

    expect(groups).toContain("BorderGlow");
    expect(groups).toContain("studio-metric");
    expect(group).not.toContain("BorderGlow");
    expect(session).toContain("BorderGlow");
    expect(session).toContain("studio-metric");
    expect(group).toContain('className="panel reveal');
    expect(session).not.toContain('lg:grid-cols-[1fr_0.9fr]');
    expect(group).toContain("继续正在进行的拍摄");
    expect(session).toContain("当前阶段");
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
