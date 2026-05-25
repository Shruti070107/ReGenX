# Solution: NUL Byte in Non-ASCII Scan Command

## What Failed

The original non-ASCII scan embedded an actual NUL byte in the command string, so the execution layer rejected the command before PowerShell could run it.

Problem file: [../problems/2026-05-23-nul-byte-rg-command.md](../problems/2026-05-23-nul-byte-rg-command.md)

## What Worked

Using a textual regular expression escape with ripgrep and PCRE2 worked:

```powershell
rg -n --pcre2 "[^\\x00-\\x7F]" -g "!package-lock.json"
```

## Why It Worked

The replacement command contains printable backslash escape sequences instead of an actual NUL byte, so the process can be created and ripgrep can interpret the pattern itself.

## Commands Run

```powershell
rg -n --pcre2 "[^\\x00-\\x7F]" -g "!package-lock.json"
```

