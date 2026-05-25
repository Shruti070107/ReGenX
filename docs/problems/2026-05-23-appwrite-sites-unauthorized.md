# Appwrite Sites Unauthorized with Provided API Key

## Exact Error

```text
[appwrite-mcp] Loading Appwrite configuration
[appwrite-mcp] Using Appwrite endpoint: https://fra.cloud.appwrite.io/v1
[appwrite-mcp] Registering Appwrite services
[appwrite-mcp] Starting Appwrite service validation
[appwrite-mcp] Validating startup access via sites
requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: https://fra.cloud.appwrite.io/v1/sites
appwrite.exception.AppwriteException: The current user is not authorized to perform the requested action.
RuntimeError: Appwrite startup validation failed during the minimal startup probe. Check your endpoint, project ID, API key, and required scopes.
- sites: Appwrite request failed (code=401, type=user_unauthorized): The current user is not authorized to perform the requested action.
mcp.shared.exceptions.McpError: Connection closed
```

## Reproduction Steps

1. Start a Sites-only Appwrite MCP runtime adapter with `APPWRITE_PROJECT_ID`, `APPWRITE_ENDPOINT`, and the provided API key in process environment variables.
2. Initialize an MCP stdio client session.
3. Observe the server exit while probing `GET /sites`.

## Environment

- OS: Windows
- Shell: PowerShell
- Workspace: `C:\Users\shrut\OneDrive\Desktop\ReGenx#`
- Appwrite MCP clone: `C:\Users\shrut\AppData\Local\Temp\appwrite-mcp-for-api`
- MCP package: `mcp-server-appwrite 0.4.1`
- Appwrite endpoint: `https://fra.cloud.appwrite.io/v1`
- Appwrite project ID: `6a0e8066000191ad6305`
- Timestamp: 2026-05-23T12:43:59.8618114+05:30

## First Hypothesis

The provided API key is missing Appwrite Sites scopes, is not attached to project `6a0e8066000191ad6305`, or was copied incorrectly. Because the same unauthorized error appeared on a second Appwrite service probe, no further deployment retry should occur until distinct fixes are evaluated.

