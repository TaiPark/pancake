import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("docker runtime image", () => {
  it("does not copy the complete builder node_modules into the runner image", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");

    expect(dockerfile).not.toContain("COPY --from=builder /workspace/node_modules ./node_modules");
    expect(dockerfile).toContain("COPY --from=builder /workspace/node_modules/prisma ./node_modules/prisma");
    expect(dockerfile).toContain("COPY --from=builder /workspace/node_modules/@prisma ./node_modules/@prisma");
  });

  it("does not seed production data on every container start", () => {
    const entrypoint = readFileSync("docker-entrypoint.sh", "utf8");

    expect(entrypoint).toContain("prisma migrate deploy");
    expect(entrypoint).not.toContain("prisma db seed");
  });
});
