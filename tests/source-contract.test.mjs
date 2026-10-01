import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
const pdd = readFileSync(new URL("../worker/pddBoundaries.ts", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

const expectedRayong = [
  "13-STC",
  "14(1)-STC",
  "14-STC",
  "14-VSD",
  "15-STC",
  "15-VSD",
  "16-STC",
  "16-VSD",
  "17-STC",
  "17-VSD",
  "18(1)-STC",
  "18-STC",
  "19-STC",
  "20-STC",
  "21-STC",
  "22(1)-STC",
  "22-STC",
  "23(1)-STC",
  "23-STC"
];

test("Rayong PDD portfolio remains exactly 19 independent plots", () => {
  const codes = [...pdd.matchAll(/"([^"]+)":\{"p":"RAYONG"/g)].map(
    (match) => match[1]
  );
  assert.deepEqual(codes, expectedRayong);
});

test("satellite search keeps every intersecting scene without a cloud threshold", () => {
  const searchBody = worker.match(/const query = \{[\s\S]*?\n  \};/)?.[0] || "";
  assert.match(searchBody, /collections: \[\.\.\.COLLECTIONS\]/);
  assert.match(searchBody, /intersects: geometry/);
  assert.match(searchBody, /datetime:/);
  assert.doesNotMatch(searchBody, /eo:cloud_cover|cloud|filter|query\s*:/i);
  assert.match(worker, /properties\["eo:cloud_cover"\]/);
  assert.match(worker, /cloudFilterApplied: false/);
});

test("all required satellite collections remain enabled", () => {
  assert.match(worker, /"sentinel-1"/);
  assert.match(worker, /"sentinel-2-l2a"/);
  assert.match(worker, /"landsat-c2-l2"/);
});

test("new app does not add D1 or R2 bindings", () => {
  assert.doesNotMatch(wrangler, /\[\[d1_databases\]\]/);
  assert.doesNotMatch(wrangler, /\[\[r2_buckets\]\]/);
  assert.doesNotMatch(worker, /D1Database|R2Bucket/);
});

test("event start and source adapters remain explicit", () => {
  assert.match(worker, /FLOOD_EVENT_START = "2026-09-27T00:00:00Z"/);
  assert.match(worker, /mangrove-area-classifier\.saratchai\.workers\.dev/);
  assert.equal(pkg.dependencies.geotiff, "^3.0.5");
});
