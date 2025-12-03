<!--
  Auto-generated starter for AI coding agents.
  Please update project-specific sections (BUILD, KEY FILES, COMMANDS)
  after reviewing the real repository contents.
-->
# Copilot / AI Agent Instructions — CarmineVisuals

Purpose
- Give immediate, actionable guidance to AI coding agents working in this repository.

Quick orientation
- Repository appears to be empty or missing source files in this workspace snapshot. Before doing non-trivial edits, open `README.md`, `src/`, `backend/`, `frontend/`, `services/`, `scripts/`, and `.github/workflows/` to confirm the real structure.

Big-picture checklist for agents
- Identify major components: web UI (`frontend/`), server/API (`backend/`), CLI/tools (`scripts/`), infra (`Dockerfile`, `docker-compose.yml`). If these folders aren't present, look for similar top-level directories.
- Locate entrypoints: web apps usually have `package.json` or `requirements.txt`; services have `main.*`, `app.py`, `Program.cs`, or `index.js`.
- Find tests in `tests/` or `**/*.spec.*` and run them before and after changes.

Build / test / debug (project-specific placeholders)
- Common commands to try (adapt to project language):
  - Install deps: ``npm ci`` or ``pip install -r requirements.txt`` or ``dotnet restore``
  - Build: ``npm run build``, ``dotnet build``, or ``cargo build``
  - Run tests: ``npm test``, ``pytest``, or ``dotnet test``
  - Start dev server: ``npm start`` or ``python -m flask run``

Project conventions (what to look for and follow)
- Import / module patterns: match existing style (ESM vs CommonJS, PEP8, camelCase vs snake_case).
- Configuration: prefer `.env` or `config/*.example` files; do not hard-code secrets — read from env vars.
- Logging & errors: follow existing logger usage (e.g., `winston`, `logging`, `Serilog`).

Integration points & external deps
- Search for references to external services: common tokens are `API_KEY`, `AWS_`, `GOOGLE_`, `STRIPE_`, `AZURE_` in `.env` or `secrets` files.
- Check `docker-compose.yml`, `Dockerfile`, CI workflows in `.github/workflows/` for deployed services and environment matrix.

PR & coding behavior
- Make minimal, focused changes; add or update tests for logic changes.
- Update or create `CHANGELOG.md` and `README.md` when adding features.
- If modifying configuration, add `*.example` and document required env vars.

Examples (how to reference code in edits)
- When fixing a bug in the API, reference the handler file (e.g., `backend/api/users.js`) and the failing test in `tests/test_users.py`.
- When adding a UI component, update `frontend/src/components/` and the index route `frontend/src/App.*`.

What to do if repository appears empty
- Ask the maintainer for the canonical repo snapshot or additional branches.
- Provide a PR with a non-invasive README and a `README.dev.md` describing how to run and where to find components.

Notes for humans updating this file
- Replace the placeholders under "Build / test / debug" and "Quick orientation" with concrete commands and paths discovered in the repository.
- Keep this file concise (20–50 lines) and focused on discoverable, actionable info.

If anything here is unclear, please update this file and leave a short note in the PR describing the change.
