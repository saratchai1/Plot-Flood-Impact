import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { app as apiApp } from "./worker/index";

const app = new Hono();

app.route("/", apiApp);
app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

const port = Number(process.env.PORT || 3000);

const server = serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`Plot Flood Impact listening on port ${info.port}`);
  }
);

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
