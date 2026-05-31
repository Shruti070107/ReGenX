# Contributing to ReGenX

Thank you for helping improve ReGenX. This guide keeps contributions focused,
reviewable, and safe for a PWA that handles user data, location workflows, AI
scanner output, and Appwrite configuration.

## Before You Start

1. Search existing issues and pull requests to avoid duplicate work.
2. Comment on the issue with a short implementation plan.
3. Wait for maintainer feedback when the issue is assigned to someone else or
   the change touches security, data deletion, authentication, Appwrite config,
   realtime sync, or scoring logic.
4. Keep the pull request scoped to one issue.

## Local Setup

```bash
git clone https://github.com/<your-username>/ReGenX.git
cd ReGenX
npm install
cp .env.example .env
npm run serve
```

Open `http://localhost:4173` and test the affected Provider, Rider, or Plant
workflow in the browser.

## Environment Rules

- Keep private values such as `APPWRITE_API_KEY` out of frontend code.
- Use `.env.example` only for placeholders and documented variable names.
- Do not commit real `.env` files, screenshots with secrets, generated tokens,
  or local machine paths.
- If a change affects configuration, update `.env.example` and the README.

## Validation Checklist

Run the most relevant checks before opening a pull request:

```bash
npm test
node --check src/app.js
node --check src/cloud-sync.js
git diff --check
```

For UI changes, also verify:

- Desktop and mobile viewport behavior.
- Dark and light theme behavior when applicable.
- No console errors during the touched flow.
- Keyboard focus and screen-reader labels for interactive controls.
- PWA-critical files such as `manifest.json` and `service-worker.js` still pass
  `npm test`.

## Code Style

- Follow the existing vanilla HTML, CSS, and JavaScript module structure.
- Prefer small helper functions over large inline handlers.
- Avoid unnecessary dependencies.
- Keep data mutations explicit and reversible where possible.
- Sanitize or escape untrusted data before inserting it into the DOM.
- Add comments only when the code path is not obvious.

## Pull Request Expectations

Your pull request should include:

- A linked issue, for example `Fixes #123`.
- A short summary of what changed.
- Validation commands and results.
- Screenshots or screen recordings for visible UI changes.
- Notes about known limitations or unrelated failing checks.

Maintainers may ask for a smaller scope, tests, screenshots, or a rebase before
reviewing. Please respond in the pull request thread and keep follow-up commits
focused on the requested changes.
