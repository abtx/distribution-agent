import "dotenv/config";
import express, { type Request as ExpressRequest, type Response as ExpressResponse } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as connections from "@/app/api/connections/route";
import * as connectionConfiguration from "@/app/api/connections/configuration/route";
import * as redditStart from "@/app/api/connections/reddit/start/route";
import * as redditCallback from "@/app/api/connections/reddit/callback/route";
import * as xStart from "@/app/api/connections/x/start/route";
import * as xCallback from "@/app/api/connections/x/callback/route";
import * as content from "@/app/api/content/route";
import * as contentItem from "@/app/api/content/[id]/route";
import * as contentPublish from "@/app/api/content/[id]/publish/route";
import * as cronDiscover from "@/app/api/cron/discover/route";
import * as cronPublish from "@/app/api/cron/publish/route";
import * as dashboard from "@/app/api/dashboard/route";
import * as discovery from "@/app/api/discovery/route";
import * as opportunity from "@/app/api/opportunities/[id]/route";
import * as opportunityPublish from "@/app/api/opportunities/[id]/publish/route";
import * as opportunityReply from "@/app/api/opportunities/[id]/reply/route";
import * as regenerate from "@/app/api/opportunities/regenerate/route";
import * as products from "@/app/api/products/route";
import * as product from "@/app/api/products/[id]/route";
import * as strategy from "@/app/api/strategy/route";
import * as strategyContext from "@/app/api/strategy/context/route";
import * as videos from "@/app/api/videos/route";
import * as video from "@/app/api/videos/[filename]/route";

type Handler = (request: Request, context: any) => Promise<Response>;
const app = express();
const port = Number(process.env.PORT || 3000);
app.use(express.raw({ type: () => true, limit: "510mb" }));

async function dispatch(handler: Handler, req: ExpressRequest, res: ExpressResponse) {
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
      else if (value !== undefined) headers.set(name, value);
    }
    const body = req.method === "GET" || req.method === "HEAD" ? undefined : req.body;
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const request = new Request(`${protocol}://${req.get("host")}${req.originalUrl}`, {
      method: req.method, headers, body, ...(body ? { duplex: "half" as const } : {}),
    });
    const response = await handler(request, { params: Promise.resolve(req.params) });
    res.status(response.status);
    response.headers.forEach((value, name) => {
      if (name !== "set-cookie") res.append(name, value);
    });
    response.headers.getSetCookie().forEach((value) => res.append("Set-Cookie", value));
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
}

function route(method: "get" | "post" | "patch" | "delete", url: string, handler: Handler) {
  app[method](url, (req, res) => void dispatch(handler, req, res));
}

route("get", "/api/connections", connections.GET as Handler);
route("delete", "/api/connections", connections.DELETE as Handler);
route("get", "/api/connections/configuration", connectionConfiguration.GET as Handler);
route("get", "/api/connections/reddit/start", redditStart.GET as Handler);
route("get", "/api/connections/reddit/callback", redditCallback.GET as Handler);
route("get", "/api/connections/x/start", xStart.GET as Handler);
route("get", "/api/connections/x/callback", xCallback.GET as Handler);
route("get", "/api/content", content.GET as Handler);
route("post", "/api/content", content.POST as Handler);
route("patch", "/api/content/:id", contentItem.PATCH as Handler);
route("post", "/api/content/:id/publish", contentPublish.POST as Handler);
route("get", "/api/cron/discover", cronDiscover.GET as Handler);
route("get", "/api/cron/publish", cronPublish.GET as Handler);
route("get", "/api/dashboard", dashboard.GET as Handler);
route("post", "/api/discovery", discovery.POST as Handler);
route("post", "/api/opportunities/regenerate", regenerate.POST as Handler);
route("patch", "/api/opportunities/:id", opportunity.PATCH as Handler);
route("post", "/api/opportunities/:id/publish", opportunityPublish.POST as Handler);
route("post", "/api/opportunities/:id/reply", opportunityReply.POST as Handler);
route("get", "/api/products", products.GET as Handler);
route("post", "/api/products", products.POST as Handler);
route("patch", "/api/products/:id", product.PATCH as Handler);
route("get", "/api/strategy", strategy.GET as Handler);
route("post", "/api/strategy", strategy.POST as Handler);
route("get", "/api/strategy/context", strategyContext.GET as Handler);
route("post", "/api/videos", videos.POST as Handler);
route("get", "/api/videos/:filename", video.GET as Handler);

const root = path.dirname(fileURLToPath(import.meta.url));
const clientDirectory = path.resolve(root, "../dist/client");
async function start() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(clientDirectory));
    app.get(/.*/, (_req, res) => res.sendFile(path.join(clientDirectory, "index.html")));
  } else {
    const vite = await (await import("vite")).createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }
  app.listen(port, "127.0.0.1", () => console.log(`Distribution Agent is running at http://localhost:${port}`));
}

void start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
