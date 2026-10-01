import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { app as apiApp } from "./worker/index";
import {
  FLOOD_EVENT_CELLS,
  FLOOD_EVENT_NO_COVERAGE,
  FLOOD_EVENT_SOURCE_WINDOWS,
  FLOOD_EVENT_SPRITE_BASE64,
  FLOOD_EVENT_SPRITE_SIZE
} from "./worker/uploadedFloodSprite";

const app = new Hono();

function spriteBase64() {
  return FLOOD_EVENT_SPRITE_BASE64;
}

const NO_COVERAGE = new Set<string>(FLOOD_EVENT_NO_COVERAGE);

const EVENT = {
  id: "uploaded-flood-rayong-20260929",
  label: "Flood Rayong 29/09/2026",
  acquiredAt: "2026-09-29T00:00:00+07:00",
  acquiredTimeKnown: false,
  sourceFileName: "Flood_Rayong_20260929.tif",
  sourceSha256: "a5c575e2cbfe57fa3f1759c8ad796928aeb76a21d1a7a7ef53a6fe31c8f5ce18",
  sourceCrs: "EPSG:32647",
  wgs84Bounds: [101.63855894268703,12.654966696082301,101.74964700767595,12.764117163477206],
  pixelSizeM: 10,
  sourceWidth: 1195,
  sourceHeight: 1196,
  bandCount: 3,
  bandInterpretation: "RGB",
  spriteWidth: FLOOD_EVENT_SPRITE_SIZE[0],
  spriteHeight: FLOOD_EVENT_SPRITE_SIZE[1]
};

app.get("/api/uploaded-flood/sprite", (c) => {
  const encoded = spriteBase64();
  if (!encoded) return c.json({ error: "UPLOADED_IMAGE_NOT_CONFIGURED" }, 503);
  return new Response(Buffer.from(encoded, "base64"), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
      "x-source-file": EVENT.sourceFileName,
      "x-source-sha256": EVENT.sourceSha256
    }
  });
});

app.get("/api/uploaded-flood/:plotCode", (c) => {
  const plotCode = decodeURIComponent(c.req.param("plotCode")).trim().toUpperCase();
  const noCoverage = NO_COVERAGE.has(plotCode);
  const cell = (FLOOD_EVENT_CELLS as Record<string, readonly [number,number,number,number]>)[plotCode] || null;
  const sourceWindow = (FLOOD_EVENT_SOURCE_WINDOWS as Record<string, readonly [number,number,number,number]>)[plotCode] || null;

  if (!noCoverage && !cell) {
    return c.json({ error: "RAYONG_PLOT_NOT_FOUND" }, 404);
  }

  return c.json({
    ...EVENT,
    coverage: noCoverage ? "NO_COVERAGE" : "FULL",
    imageAvailable: !noCoverage,
    cell,
    sourceWindow,
    sourceValidFraction: noCoverage ? 0 : 1,
    spriteUrl: noCoverage ? null : "/api/uploaded-flood/sprite"
  });
});

app.route("/", apiApp);
app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

const port = Number(process.env.PORT || 3000);
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Plot Flood Impact V2 listening on port ${info.port}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
