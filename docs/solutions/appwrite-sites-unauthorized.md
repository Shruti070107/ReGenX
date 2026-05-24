# Decision: Appwrite Sites Unauthorized

Problem file: [../problems/2026-05-23-appwrite-sites-unauthorized.md](../problems/2026-05-23-appwrite-sites-unauthorized.md)

Related problem file: [../problems/2026-05-23-appwrite-mcp-tablesdb-unauthorized.md](../problems/2026-05-23-appwrite-mcp-tablesdb-unauthorized.md)

## What Failed

The provided API key failed Appwrite authorization checks for both the default MCP startup probe (`tables_db`) and a Sites-only MCP startup probe (`GET /sites`). The repeated `401 user_unauthorized` response means continuing to retry deployment with the same key would violate the retry rule and would not be evidence-based.

## Researched Options

1. Create or update an Appwrite API key with `sites.read` and `sites.write`.
   - Trade-off: This is the least-privilege deployment key for Appwrite Sites, but it requires access to the Appwrite Console or a key that can manage keys.

2. Create a broader MCP key with `tables.read`, `sites.read`, and `sites.write`.
   - Trade-off: This allows the unmodified Appwrite MCP server to pass its default startup probe, but it grants database read access that is not needed for a static site deployment.

3. Use a Sites-only MCP runtime adapter with a key that has `sites.read` and `sites.write`.
   - Trade-off: This keeps the deployment key scoped to Sites and still uses MCP tool flow, but it needs a runtime adapter because the current MCP server validates the first registered service.

4. Use the existing repository REST deployment script with a key that has `sites.read` and `sites.write`.
   - Trade-off: This is operationally simple and already implemented in the repo, but it does not satisfy the preference to use the MCP server as the primary interface.

5. Connect Appwrite Sites to the GitHub repository through the Appwrite Console and deploy from VCS.
   - Trade-off: This reduces local credential handling, but it requires console setup and repository integration before automation can verify a deployment.

## Selected Path

Use a new or corrected Appwrite API key with `sites.read` and `sites.write`, then run the Sites-only MCP runtime adapter first. If the adapter succeeds, use MCP to inspect/create deployment resources. If Appwrite's MCP surface cannot upload the local source archive cleanly, fall back to the repository's REST deployment script with the same corrected Sites key and document the fallback.

## Why This Path

It avoids granting unrelated TablesDB permissions, honors the request to use MCP first, and keeps the existing deployment script as a narrow fallback only after MCP access is proven.

## Commands Run
```powershell
uv --version
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -e .
# Started Appwrite MCP over stdio with APPWRITE_PROJECT_ID, APPWRITE_ENDPOINT, and APPWRITE_API_KEY set in process environment.
# Started a Sites-only Appwrite MCP runtime adapter over stdio with the same process environment.
```

## Current Status

Blocked from deployment until a corrected Appwrite API key is available. The current key must not be retried for deployment because it has already produced repeated authorization failures.

