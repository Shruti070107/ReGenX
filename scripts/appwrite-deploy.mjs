import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";

const rootDir = process.cwd();
const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const siteId = process.env.APPWRITE_SITE_ID || "regenx-control-room";
const siteName = process.env.APPWRITE_SITE_NAME || "ReGenX Control Room";

if (!endpoint || !projectId || !apiKey) {
  console.error(
    "Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, or APPWRITE_API_KEY. Check .env.example."
  );
  process.exit(1);
}
function request(url, options = {}) {
  const headers = {
    "X-Appwrite-Project": projectId,
    "X-Appwrite-Key": apiKey,
    "X-Appwrite-Response-Format": "1.8.0",
    ...(options.headers || {})
  };

  return fetch(url, {
    ...options,
    headers
  });
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function ensureSite() {
  const getResponse = await request(`${endpoint}/sites/${siteId}`);

  if (getResponse.ok) {
    return getResponse.json();
  }

  if (getResponse.status !== 404) {
    const errorText = await getResponse.text();
    throw new Error(`Unable to inspect site: ${errorText}`);
  }

  const createResponse = await request(`${endpoint}/sites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      siteId,
      name: siteName,
      framework: "other",
      buildRuntime: "node-22",
      enabled: true,
      logging: true,
      installCommand: "",
      buildCommand: "",
      outputDirectory: ".",
      adapter: "static",
      fallbackFile: "index.html",
      deploymentRetention: 0
    })
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Unable to create site: ${errorText}`);
  }

  return createResponse.json();
}

async function createArchive() {
  const archivePath = path.join(tmpdir(), `regenx-${Date.now()}.tar.gz`);
  const args = [
    "--exclude=node_modules",
    "--exclude=dist",
    "--exclude=.git",
    "--exclude=.env",
    "--exclude=.env.local",
    "--exclude=.env.production",
    "-czf",
    archivePath,
    "."
  ];

  await run("tar", args, rootDir);
  return archivePath;
}

async function createDeployment(archivePath) {
  const formData = new FormData();
  const archiveBuffer = await readFile(archivePath);
  formData.set(
    "code",
    new Blob([archiveBuffer], { type: "application/gzip" }),
    "code.tar.gz"
  );
  formData.set("activate", "true");

  const deploymentResponse = await request(`${endpoint}/sites/${siteId}/deployments`, {
    method: "POST",
    body: formData
  });

  if (!deploymentResponse.ok) {
    const errorText = await deploymentResponse.text();
    throw new Error(`Unable to create deployment: ${errorText}`);
  }

  return deploymentResponse.json();
}

async function waitForDeployment(deploymentId) {
  const terminalStates = new Set(["active", "ready", "failed"]);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await request(`${endpoint}/sites/${siteId}/deployments/${deploymentId}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Unable to inspect deployment: ${errorText}`);
    }

    const deployment = await response.json();
    console.log(`Deployment status: ${deployment.status}`);

    if (terminalStates.has(deployment.status)) {
      if (deployment.status === "ready") {
        const activateResponse = await request(`${endpoint}/sites/${siteId}/deployment`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ deploymentId })
        });

        if (!activateResponse.ok) {
          const errorText = await activateResponse.text();
          throw new Error(`Unable to activate deployment: ${errorText}`);
        }
      }

      if (deployment.status === "failed") {
        throw new Error(`Deployment failed. Review Appwrite build logs for ${deploymentId}.`);
      }

      return deployment;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error("Deployment timed out after 5 minutes.");
}

async function main() {
  console.log("Preparing Appwrite site...");
  await ensureSite();

  console.log("Packaging source for Appwrite...");
  const archivePath = await createArchive();

  try {
    console.log("Uploading deployment...");
    const deployment = await createDeployment(archivePath);
    const finalDeployment = await waitForDeployment(deployment.$id);
    console.log(`Deployment complete: ${finalDeployment.$id}`);
    console.log(`Site ID: ${siteId}`);
  } finally {
    await rm(archivePath, { force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
