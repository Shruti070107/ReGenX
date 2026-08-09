# Solution: uv Not Installed for Appwrite MCP Server

Problem file: [../problems/2026-05-23-uv-not-installed.md](../problems/2026-05-23-uv-not-installed.md)

## What Failed

The Appwrite MCP README recommends `uvx mcp-server-appwrite`, but `uv` was not installed or available on `PATH`.

## What Worked

Creating a temporary Python virtual environment and installing the cloned Appwrite MCP package with `pip` worked.

## Why It Worked

The Appwrite MCP package also supports pip-based installation. A temporary virtual environment provides the required Python dependencies without changing the global machine setup or adding dependency artifacts to the ReGenX repository.

## Commands Run

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -e .
.\.venv\Scripts\python.exe -c "import mcp; from mcp import ClientSession, StdioServerParameters; from mcp.client.stdio import stdio_client; print('mcp client imports ok')"
```

