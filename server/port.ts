import type { Server } from "node:http";

type ListenApp = {
  listen(
    port: number,
    host: string,
    callback: (error?: NodeJS.ErrnoException) => void,
  ): Server;
};

export async function listenWithPortFallback(
  app: ListenApp,
  preferredPort: number,
  host = "127.0.0.1",
  attempts = 20,
) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = preferredPort + offset;
    const result = await new Promise<
      { server: Server; port: number } | { error: NodeJS.ErrnoException }
    >((resolve) => {
      let settled = false;
      const finish = (
        value: { server: Server; port: number } | { error: NodeJS.ErrnoException },
      ) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const server = app.listen(port, host, (error) =>
        finish(error ? { error } : { server, port }),
      );
      server.once("error", (error: NodeJS.ErrnoException) =>
        finish({ error }),
      );
    });
    if ("server" in result) return result;
    if (result.error.code !== "EADDRINUSE") throw result.error;
  }
  throw new Error(
    `Could not find an available port between ${preferredPort} and ${preferredPort + attempts - 1}`,
  );
}
