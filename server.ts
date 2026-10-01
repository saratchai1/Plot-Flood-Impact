import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { app as apiApp } from "./worker/index";

const app = new Hono();

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
  spriteWidth: 1100,
  spriteHeight: 510,
  coverage: {
    "13-STC": ["FULL",[0,0,220,170]],
    "14(1)-STC": ["FULL",[220,0,220,170]],
    "14-STC": ["FULL",[440,0,220,170]],
    "14-VSD": ["FULL",[660,0,220,170]],
    "15-STC": ["NO_COVERAGE",null],
    "15-VSD": ["FULL",[880,0,220,170]],
    "16-STC": ["FULL",[0,170,220,170]],
    "16-VSD": ["FULL",[220,170,220,170]],
    "17-STC": ["FULL",[440,170,220,170]],
    "17-VSD": ["FULL",[660,170,220,170]],
    "18(1)-STC": ["FULL",[880,170,220,170]],
    "18-STC": ["FULL",[0,340,220,170]],
    "19-STC": ["FULL",[220,340,220,170]],
    "20-STC": ["FULL",[440,340,220,170]],
    "21-STC": ["NO_COVERAGE",null],
    "22(1)-STC": ["NO_COVERAGE",null],
    "22-STC": ["NO_COVERAGE",null],
    "23(1)-STC": ["FULL",[660,340,220,170]],
    "23-STC": ["FULL",[880,340,220,170]]
  } as Record<string, [string, [number,number,number,number] | null]>
};

app.get("/api/uploaded-flood/:plotCode", (c) => {
  const plotCode = decodeURIComponent(c.req.param("plotCode")).trim().toUpperCase();
  const row = EVENT.coverage[plotCode];
  if (!row) return c.json({ error: "RAYONG_PLOT_NOT_FOUND" }, 404);
  return c.json({
    ...EVENT,
    coverage: row[0],
    imageAvailable: row[0] !== "NO_COVERAGE" && Boolean(process.env.FLOOD_EVENT_SPRITE),
    cell: row[1],
    spriteUrl: row[0] === "NO_COVERAGE" ? null : "/api/uploaded-flood/sprite"
  });
});

app.get("/api/uploaded-flood/sprite", (c) => {
  const encoded = process.env.FLOOD_EVENT_SPRITE;
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

app.route("/", apiApp);
app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

const port = Number(process.env.PORT || 3000);
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Plot Flood Impact V2 listening on port ${info.port}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
