import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type Platform = "reddit" | "x";
export interface Connection {
  platform: Platform;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  account_id: string;
  account_name: string;
  scopes: string[];
  connected_at: string;
}

const directory = path.join(process.cwd(), ".data");
const filename = path.join(directory, "connections.json");
let queue = Promise.resolve();

async function read(): Promise<Connection[]> {
  try {
    return JSON.parse(await readFile(filename, "utf8")) as Connection[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [];
  }
}
async function write(connections: Connection[]) {
  await mkdir(directory, { recursive: true });
  const temporary = `${filename}.tmp`;
  queue = queue.then(async () => {
    await writeFile(temporary, JSON.stringify(connections, null, 2), {
      mode: 0o600,
    });
    await rename(temporary, filename);
    await chmod(filename, 0o600);
  });
  await queue;
}

export const connectionStore = {
  async all() {
    return read();
  },
  async get(platform: Platform) {
    return (
      (await read()).find((connection) => connection.platform === platform) ||
      null
    );
  },
  async save(connection: Connection) {
    const connections = (await read()).filter(
      (item) => item.platform !== connection.platform,
    );
    connections.push(connection);
    await write(connections);
    return connection;
  },
  async remove(platform: Platform) {
    const connections = await read();
    const next = connections.filter((item) => item.platform !== platform);
    await write(next);
    return next.length !== connections.length;
  },
};

export function safeConnection(connection: Connection) {
  return {
    platform: connection.platform,
    account_id: connection.account_id,
    account_name: connection.account_name,
    scopes: connection.scopes,
    connected_at: connection.connected_at,
    expires_at: connection.expires_at,
  };
}
