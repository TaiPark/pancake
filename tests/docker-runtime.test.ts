import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("docker runtime image", () => {
  it("does not copy the complete builder node_modules into the runner image", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");

    expect(dockerfile).not.toContain("COPY --from=builder /workspace/node_modules ./node_modules");
    expect(dockerfile).not.toContain("COPY --from=builder /workspace/node_modules/.bin/prisma");
    expect(dockerfile).toContain("COPY --from=builder /workspace/node_modules/prisma ./node_modules/prisma");
    expect(dockerfile).toContain("COPY --from=builder /workspace/node_modules/@prisma ./node_modules/@prisma");
    expect(dockerfile).toContain("COPY --from=builder /workspace/node_modules/effect ./node_modules/effect");
    expect(dockerfile).toContain("COPY --from=builder /workspace/node_modules/c12 ./node_modules/c12");
    expect(dockerfile).toContain("COPY --from=builder /workspace/node_modules/deepmerge-ts ./node_modules/deepmerge-ts");
    expect(dockerfile).toContain("COPY --from=builder /workspace/node_modules/empathic ./node_modules/empathic");
    expect(dockerfile).toContain("COPY --from=builder /workspace/node_modules/@standard-schema ./node_modules/@standard-schema");
  });

  it("does not seed production data on every container start", () => {
    const entrypoint = readFileSync("docker-entrypoint.sh", "utf8");

    expect(entrypoint).toContain("node ./node_modules/prisma/build/index.js migrate deploy");
    expect(entrypoint).not.toContain("./node_modules/.bin/prisma");
    expect(entrypoint).not.toContain("prisma db seed");
  });
});
