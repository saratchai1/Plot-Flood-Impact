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


test("V2 uploaded flood sprite is complete WebP from audited plot crops", () => {
  const spriteSource = readFileSync(
    new URL("../worker/uploadedFloodSprite.ts", import.meta.url),
    "utf8"
  );
  const match = spriteSource.match(/FLOOD_EVENT_SPRITE_BASE64 = (".*");/s);
  assert.ok(match, "embedded flood sprite constant is present");
  const base64 = JSON.parse(match[1]);
  const bytes = Buffer.from(base64, "base64");
  assert.equal(base64.length, 15304);
  assert.equal(bytes.length, 11478);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
  assert.match(spriteSource, /FLOOD_EVENT_SPRITE_SIZE = \[480, 288\]/);
});

test("V2 uses uploaded flood imagery and comparison slider without live STAC fetch", () => {
  const appSource = readFileSync(
    new URL("../src/App.tsx", import.meta.url),
    "utf8"
  );
  const sliderSource = readFileSync(
    new URL("../src/CompareSlider.tsx", import.meta.url),
    "utf8"
  );
  assert.match(appSource, /getUploadedFlood/);
  assert.doesNotMatch(appSource, /getSatellite/);
  assert.match(appSource, /CompareSlider/);
  assert.match(appSource, /ไม่มีภาพดาวเทียมสำหรับแปลง/);
  assert.match(sliderSource, /type="range"/);
  assert.match(sliderSource, /Satellite source window/);
});

test("V2 crop mapping is generated and contains exactly 15 covered plots", () => {
  const spriteSource = readFileSync(
    new URL("../worker/uploadedFloodSprite.ts", import.meta.url),
    "utf8"
  );
  const cellBlock =
    spriteSource.match(/FLOOD_EVENT_CELLS = (\{.*?\}) as const;/s)?.[1] || "";
  const windowBlock =
    spriteSource.match(/FLOOD_EVENT_SOURCE_WINDOWS = (\{.*?\}) as const;/s)?.[1] || "";
  const noCoverageBlock =
    spriteSource.match(/FLOOD_EVENT_NO_COVERAGE = (\[.*?\]) as const;/s)?.[1] || "";

  assert.equal(Object.keys(JSON.parse(cellBlock)).length, 15);
  assert.equal(Object.keys(JSON.parse(windowBlock)).length, 15);
  assert.deepEqual(JSON.parse(noCoverageBlock), [
    "15-STC",
    "21-STC",
    "22(1)-STC",
    "22-STC"
  ]);
});

test("V2 server derives plot coverage from generated mapping", () => {
  const server = readFileSync(
    new URL("../server.ts", import.meta.url),
    "utf8"
  );
  assert.match(server, /FLOOD_EVENT_CELLS/);
  assert.match(server, /FLOOD_EVENT_SOURCE_WINDOWS/);
  assert.match(server, /FLOOD_EVENT_NO_COVERAGE/);
  assert.match(server, /sourceValidFraction: noCoverage \? 0 : 1/);
  assert.ok(
    server.indexOf('app.get("/api/uploaded-flood/sprite"') <
      server.indexOf('app.get("/api/uploaded-flood/:plotCode"'),
    "static sprite route must be registered before the parameter route"
  );
  assert.match(
    server,
    /a5c575e2cbfe57fa3f1759c8ad796928aeb76a21d1a7a7ef53a6fe31c8f5ce18/
  );
});
