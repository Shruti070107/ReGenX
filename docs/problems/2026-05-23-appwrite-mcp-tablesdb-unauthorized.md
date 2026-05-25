# Appwrite MCP Startup Probe Unauthorized for TablesDB

## Exact Error

```text
[appwrite-mcp] Loading Appwrite configuration
[appwrite-mcp] Using Appwrite endpoint: https://fra.cloud.appwrite.io/v1
[appwrite-mcp] Registering Appwrite services
[appwrite-mcp] Starting Appwrite service validation
[appwrite-mcp] Validating startup access via tables_db
appwrite.exception.AppwriteException: The current user is not authorized to perform the requested action.
RuntimeError: Appwrite startup validation failed during the minimal startup probe. Check your endpoint, project ID, API key, and required scopes.
- tables_db: Appwrite request failed (code=401, type=user_unauthorized): The current user is not authorized to perform the requested action.
mcp.shared.exceptions.McpError: Connection closed
```

## Reproduction Steps

1. Start the Appwrite MCP server with `APPWRITE_PROJECT_ID`, `APPWRITE_ENDPOINT`, and the provided API key in process environment variables.
2. Initialize an MCP stdio client session.
3. Observe the server exit during startup validation when probing `tables_db`.

## Environment

- OS: Windows
- Shell: PowerShell
- Workspace: `C:\Users\shrut\OneDrive\Desktop\ReGenx#`
- Appwrite MCP clone: `C:\Users\shrut\AppData\Local\Temp\appwrite-mcp-for-api`
- MCP package: `mcp-server-appwrite 0.4.1`
- Appwrite endpoint: `https://fra.cloud.appwrite.io/v1`
- Appwrite project ID: `6a0e8066000191ad6305`
- Timestamp: 2026-05-23T12:35:06.7265231+05:30

## First Hypothesis

The API key is valid enough to be supplied to the MCP server, but it lacks the TablesDB permission required by the MCP server's global startup probe. The deployment task only needs Appwrite Sites permissions, so a Sites-focused MCP invocation or a direct Sites API deployment may still work.

