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

console.log("Module files exist check passed");
