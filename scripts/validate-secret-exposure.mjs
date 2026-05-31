import fs from "fs";
import path from "path";

const browserRoots = [
  "index.html",
  "offline.html",
  "service-worker.js",
  "src"
];

const blockedPatterns = [
  {
    pattern: /\bAPPWRITE_API_KEY\b/,
    message: "Private APPWRITE_API_KEY must not appear in browser-delivered files"
  },
  {
    pattern: /fetch\s*\(\s*['"`]\/\.env['"`]/,
    message: "Browser code must not fetch /.env"
  },
  {
    pattern: /\bREALTIME_AUTH_TOKEN\b/,
    message: "Private realtime auth tokens must not appear in browser-delivered files"
  }
];

function collectFiles(entry) {
  if (!fs.existsSync(entry)) {
    return [];
  }

  const stat = fs.statSync(entry);
  if (stat.isFile()) {
    return [entry];
  }

  return fs.readdirSync(entry, { withFileTypes: true }).flatMap((child) => {
    const childPath = path.join(entry, child.name);
    if (child.isDirectory()) {
      return collectFiles(childPath);
    }
    return child.isFile() ? [childPath] : [];
  });
}

const files = browserRoots.flatMap(collectFiles);
const violations = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const { pattern, message } of blockedPatterns) {
    if (pattern.test(content)) {
      violations.push(`${file}: ${message}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Secret exposure validation failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Secret exposure check passed");
