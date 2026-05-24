# NUL Byte in Non-ASCII Scan Command

## Exact Error

```text
exec_command failed for `<command included NUL byte>`: CreateProcess { message: "Rejected(\"Failed to create unified exec process: nul byte found in provided data\")" }
```

## Reproduction Steps

1. Run a PowerShell command through the execution tool that includes a malformed `rg` pattern containing a NUL byte.
2. Observe that process creation is rejected before PowerShell starts.

## Environment

- OS: Windows
- Shell: PowerShell
- Workspace: `C:\Users\shrut\OneDrive\Desktop\ReGenx#`
- Timestamp: 2026-05-23T12:26:51.3435438+05:30

## First Hypothesis

The command string embedded an actual NUL character while attempting to search for non-ASCII text. The execution layer rejects NUL bytes before spawning the command.

