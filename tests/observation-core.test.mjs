import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { geometryBounds, formatBangkok, stacSceneKey, VERSION } from "../src/shared/observation-core/index.mjs";

function blob(file) {
  const bytes = readFileSync(new URL(file, import.meta.url));
  return createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
}
test("canonical environmental core is pinned without runtime network access", () => {
  assert.equal(blob("../src/shared/observation-core/core.js"), "b51165d97d05756e6dca3ed7836b1bd5e6980dd3");
  assert.equal(blob("../src/shared/observation-core/index.mjs"), "4023fa066f261f3a91a7db754768dad8143a93bc");
  assert.equal(blob("../src/shared/observation-core/index.d.mts"), "423479ae4ab0e8bb865bbc44ff22922049301a52");
  assert.equal(VERSION, "0.1.0");
});
test("Rayong geometry bounds parity for PDD polygon", () => {
  const p = { type: "Polygon", coordinates: [[[101.0, 12.5], [101.5, 12.5], [101.5, 13.2], [101.0, 12.5]]] };
  assert.deepEqual(geometryBounds(p), [101, 12.5, 101.5, 13.2]);
  assert.equal(geometryBounds({ type: "Polygon", coordinates: [] }), null);
});
test("STAC identity is sensor collection scoped; Bangkok time display matches legacy", () => {
  assert.equal(stacSceneKey("sentinel-2-l2a", "X"), "sentinel-2-l2a:X");
  assert.notEqual(stacSceneKey("sentinel-1", "X"), stacSceneKey("sentinel-2-l2a", "X"));
  const stamp = "2026-09-29T03:54:50Z";
  assert.equal(formatBangkok(stamp, { dateStyle: "medium", timeStyle: "short" }),
    new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }).format(new Date(stamp)));
});
