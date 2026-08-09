import fs from "fs";

const requiredFiles = [
  "README.md",
  ".env.example",
  ".gitignore"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing file: ${file}`);
    process.exit(1);
  }
}

// Additional health check: check that .env.example contains necessary deployment environment variables
try {
  const envContent = fs.readFileSync(".env.example", "utf8");
  const requiredEnv = ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"];
  for (const env of requiredEnv) {
    if (!envContent.includes(env)) {
      console.error(`Missing required deployment environment variable in .env.example: ${env}`);
      process.exit(1);
    }
  }
  console.log(".env.example template is complete");
} catch (e) {
  console.error("Failed to read .env.example:", e.message);
  process.exit(1);
}

console.log("Health check passed");
