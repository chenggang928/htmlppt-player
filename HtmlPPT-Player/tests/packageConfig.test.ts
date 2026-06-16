import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("package electron config", () => {
  const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));

  it("points Electron at electron-vite output", () => {
    expect(packageJson.main).toBe("out/main/index.js");
    expect(packageJson.build.files).toContain("out/**");
  });
});
