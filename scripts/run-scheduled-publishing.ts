import { loadEnvConfig } from "@next/env";
import { publishDueContent } from "../lib/publishContent";

loadEnvConfig(process.cwd());

async function main() {
  const results = await publishDueContent();
  if (results.length)
    console.log(`Processed ${results.length} scheduled content item(s).`);
  for (const result of results)
    if (!result.ok) console.error(`${result.id}: ${result.error}`);
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}
void main();
