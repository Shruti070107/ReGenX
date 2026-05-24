# uv Not Installed for Appwrite MCP Server

## Exact Error

```text
uv : The term 'uv' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the 
spelling of the name, or if a path was included, verify that the path is correct and try again.
At line:2 char:1
+ uv --version
+ ~~
    + CategoryInfo          : ObjectNotFound: (uv:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException
```

## Reproduction Steps

1. Open PowerShell.
2. Run `uv --version`.
3. Observe that PowerShell cannot resolve the `uv` executable.

## Environment

- OS: Windows
- Shell: PowerShell
- Workspace: `C:\Users\shrut\OneDrive\Desktop\ReGenx#`
- Appwrite MCP clone: `C:\Users\shrut\AppData\Local\Temp\appwrite-mcp-for-api`
- Timestamp: 2026-05-23T12:30:20.2410294+05:30

## First Hypothesis

The Appwrite MCP server README recommends `uvx`, but `uv` is not installed or is not on `PATH`. A temporary Python virtual environment with `pip` should run the same server without changing global toolchain state.

