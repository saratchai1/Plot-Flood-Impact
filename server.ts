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
  coverage: {
    "13-STC": ["FULL","FLOOD_IMG_13_STC",176,138],
    "14(1)-STC": ["FULL","FLOOD_IMG_14_1_STC",72,72],
    "14-STC": ["FULL","FLOOD_IMG_14_STC",63,59],
    "14-VSD": ["FULL","FLOOD_IMG_14_VSD",102,79],
    "15-STC": ["NO_COVERAGE",null,0,0],
    "15-VSD": ["FULL","FLOOD_IMG_15_VSD",101,88],
    "16-STC": ["FULL","FLOOD_IMG_16_STC",80,84],
    "16-VSD": ["FULL","FLOOD_IMG_16_VSD",84,79],
    "17-STC": ["FULL","FLOOD_IMG_17_STC",174,130],
    "17-VSD": ["FULL","FLOOD_IMG_17_VSD",84,77],
    "18(1)-STC": ["FULL","FLOOD_IMG_18_1_STC",84,76],
    "18-STC": ["FULL","FLOOD_IMG_18_STC",93,104],
    "19-STC": ["FULL","FLOOD_IMG_19_STC",80,73],
    "20-STC": ["FULL","FLOOD_IMG_20_STC",90,94],
    "21-STC": ["NO_COVERAGE",null,0,0],
    "22(1)-STC": ["NO_COVERAGE",null,0,0],
    "22-STC": ["NO_COVERAGE",null,0,0],
    "23(1)-STC": ["FULL","FLOOD_IMG_23_1_STC",72,64],
    "23-STC": ["FULL","FLOOD_IMG_23_STC",103,77]
  } as Record<string, [string, string | null, number, number]>
};

app.get("/api/uploaded-flood/:plotCode", (c) => {
  const plotCode = decodeURIComponent(c.req.param("plotCode")).trim().toUpperCase();
  const row = EVENT.coverage[plotCode];
  if (!row) return c.json({ error: "RAYONG_PLOT_NOT_FOUND" }, 404);
  return c.json({
    ...EVENT,
    coverage: row[0],
    imageAvailable: row[0] !== "NO_COVERAGE" && Boolean(row[1] && process.env[row[1]]),
    width: row[2],
    height: row[3],
    imageUrl: row[0] === "NO_COVERAGE" ? null : "/api/uploaded-flood/" + encodeURIComponent(plotCode) + "/image"
  });
});

app.get("/api/uploaded-flood/:plotCode/image", (c) => {
  const plotCode = decodeURIComponent(c.req.param("plotCode")).trim().toUpperCase();
  const row = EVENT.coverage[plotCode];
  if (!row) return c.json({ error: "RAYONG_PLOT_NOT_FOUND" }, 404);
  if (row[0] === "NO_COVERAGE" || !row[1]) return c.json({ error: "NO_COVERAGE" }, 404);
  const encoded = process.env[row[1]];
  if (!encoded) return c.json({ error: "UPLOADED_IMAGE_NOT_CONFIGURED" }, 503);
  const bytes = Buffer.from(encoded, "base64");
  return new Response(bytes, {
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
