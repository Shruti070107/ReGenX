import fs from "fs";

const filesToCheck = [
  "src/app.js",
  "src/scanner.js",
  "src/intelligence.js"
];

for (const file of filesToCheck) {
  if (!fs.existsSync(file)) {
    console.error(`Missing module: ${file}`);
    process.exit(1);
  }
}

const appSource = fs.readFileSync("src/app.js", "utf8");
if (!/function\s+normalizeHash\s*\(/.test(appSource)) {
  console.error("Missing normalizeHash helper required by integrity scan");
  process.exit(1);
}

if (!/normalizeHash\(storedHash\)\s*!==\s*normalizeHash\(expectedHash\)/.test(appSource)) {
  console.error("Integrity scan hash comparison must use normalizeHash on both values");
  process.exit(1);
}

console.log("Module files exist check passed");
