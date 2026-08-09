import fs from "fs";

const manifestPath = fs.existsSync("public/manifest.json") ? "public/manifest.json" : "manifest.json";
const offlinePath = fs.existsSync("public/offline.html") ? "public/offline.html" : "offline.html";

if (!fs.existsSync(manifestPath)) {
  console.error(`Missing manifest.json (checked public/manifest.json and manifest.json)`);
  process.exit(1);
}

if (!fs.existsSync(offlinePath)) {
  console.error(`Missing offline.html (checked public/offline.html and offline.html)`);
  process.exit(1);
}

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  console.log(`${manifestPath} is valid JSON`);
  
  // Basic validation of PWA manifest keys
  const requiredKeys = ["name", "short_name", "start_url", "display"];
  for (const key of requiredKeys) {
    if (!(key in manifest)) {
      console.error(`PWA Manifest missing required key: ${key}`);
      process.exit(1);
    }
  }
} catch (e) {
  console.error(`${manifestPath} parsing failed:`, e.message);
  process.exit(1);
}

console.log("PWA check passed");
