import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const forbidden = [
  "fixture-only-access",
  "https://api.brekmate.test",
  "Bearer local-manager",
  "Bearer local-customer",
  "Synthetic fixture office",
];
function files(root) {
  return readdirSync(root).flatMap((n) => {
    const p = join(root, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}
let count = 0;
for (const root of ["apps/staff/dist", "apps/mobile/dist"])
  for (const path of files(root)) {
    if (!/\.(js|mjs|hbc|html|json)$/.test(path)) continue;
    const bytes = readFileSync(path);
    for (const token of forbidden)
      if (bytes.includes(Buffer.from(token)))
        throw new Error("Test-only data found in " + path);
    count++;
  }
console.log(
  `Checked ${count} build files: test harness origins/tokens are absent.`,
);
