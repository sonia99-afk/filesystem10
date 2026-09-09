import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("все подключённые ресурсы существуют и не пусты", () => {
  const result = spawnSync(process.execPath, ["scripts/audit-project.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    `${result.stdout}\n${result.stderr}`,
  );
});
