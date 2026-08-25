import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { runDiscovery } from "../lib/discovery/runDiscovery";
loadEnvConfig(process.cwd());
const dataDir = path.join(process.cwd(), ".data"),
  markerFile = path.join(dataDir, "last-daily-discovery.json");
function londonDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
async function main() {
  const today = londonDay();
  let lastDay: string | undefined;
  if (existsSync(markerFile)) {
    try {
      lastDay = (
        JSON.parse(readFileSync(markerFile, "utf8")) as { day?: string }
      ).day;
    } catch {
      /* A corrupt marker should not prevent discovery. */
    }
  }
  if (lastDay === today) {
    console.log(`Discovery already completed for ${today}; skipping.`);
    return;
  }
  try {
    const run = await runDiscovery();
    mkdirSync(dataDir, { recursive: true });
    const temp = `${markerFile}.tmp`;
    writeFileSync(
      temp,
      JSON.stringify(
        { day: today, completed_at: run.completed_at, run_id: run.id },
        null,
        2,
      ),
    );
    renameSync(temp, markerFile);
    console.log(
      `Discovery completed: ${run.candidates_found} candidates, ${run.opportunities_created} opportunities.`,
    );
  } catch (error) {
    console.error("Daily discovery failed:", error);
    process.exitCode = 1;
  }
}
void main();
