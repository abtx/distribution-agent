import { EventEmitter } from "node:events";
import type { Server } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { listenWithPortFallback } from "@/server/port";

describe("server port selection", () => {
  it("advances to the next port when the preferred port is occupied", async () => {
    const listen = vi.fn(
      (
        port: number,
        _host: string,
        callback: (error?: NodeJS.ErrnoException) => void,
      ) => {
        const server = new EventEmitter() as Server;
        queueMicrotask(() => {
          if (port === 3000) {
            callback(
              Object.assign(new Error("Port occupied"), {
                code: "EADDRINUSE",
              }) as NodeJS.ErrnoException,
            );
          } else callback();
        });
        return server;
      },
    );

    const result = await listenWithPortFallback({ listen }, 3000);

    expect(result.port).toBe(3001);
    expect(listen).toHaveBeenCalledTimes(2);
  });
});
