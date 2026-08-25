import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import "dotenv/config";
import { runDiscovery } from "../lib/discovery/runDiscovery";
import { currentDiscoverySlot } from "../lib/discovery/schedule";
const dataDir = path.join(process.cwd(), ".data"),
  markerFile = path.join(dataDir, "last-scheduled-discovery.json");
async function main() {
  const scheduled = process.env.DISCOVERY_SCHEDULE_ONLY === "true";
  const slot = scheduled ? currentDiscoverySlot() : null;
  if (scheduled && !slot) {
    console.log("No active 08:00 or 20:00 discovery slot; skipping missed run.");
    return;
  }
  let lastSlot: string | undefined;
  if (existsSync(markerFile)) {
    try {
      lastSlot = (
        JSON.parse(readFileSync(markerFile, "utf8")) as { slot?: string }
      ).slot;
    } catch {
      /* A corrupt marker should not prevent discovery. */
    }
  }
  if (slot && lastSlot === slot) {
    console.log(`Discovery already completed for ${slot}; skipping.`);
    return;
  }
  try {
    const run = await runDiscovery();
    mkdirSync(dataDir, { recursive: true });
    if (slot) {
      const temp = `${markerFile}.tmp`;
      writeFileSync(
        temp,
        JSON.stringify(
          { slot, completed_at: run.completed_at, run_id: run.id },
          null,
          2,
        ),
      );
      renameSync(temp, markerFile);
    }
    console.log(
      `Discovery completed: ${run.candidates_found} candidates, ${run.opportunities_created} opportunities.`,
    );
  } catch (error) {
    console.error("Discovery failed:", error);
    process.exitCode = 1;
  }
}
void main();
