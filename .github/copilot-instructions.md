# GitHub Copilot / AI Agent Instructions

This repository is a small personal/static website (found files: `CNAME`, `README.md`).

Summary
- Purpose: personal portfolio / static site. Primary content lives in markdown/HTML at the repo root.
- Key files to preserve: `CNAME` (custom domain), `README.md` (profile content).

Prompt Modes (first-line mode handling)
- Mode is set by listing one or more mode keywords on the very first line of the user's prompt (comma or space separated).
- Supported modes (control rules):
	- `ADVICE-ONLY`: No code edits. Agent may collect app context. Provide only high-level guidance and code snippets; list exact files to change when suggesting edits.
	- `IMPLEMENT`: Default mode. Code edits are allowed. The agent may read and modify repository files. If a change risks breaking logic, the agent must ask for explicit confirmation before applying edits.
	- `TEST-ONLY`: Only create or modify test files; do not change production code.
	- `NO-CONTEXT`: Do not collect or read repository files even if other modes are present.
	- `VERBOSE`: Provide in-depth explanations in responses and reasoning steps.

- Multiple modes may be combined (e.g., `IMPLEMENT VERBOSE`). If `NO-CONTEXT` is present, it overrides other modes.
- If mode is omitted, `IMPLEMENT` applies.
- If context is insufficient for the requested mode, respond exactly with: "NO ENOUGH CONTEXT" and stop.

Agent operating rules (enforced)
- Always generate a short TODO list before starting any task and present it to the user for confirmation.
- Never run background terminal commands; any command the agent runs must be visible and its output shown to the user.
- When `IMPLEMENT` is active, the agent may edit files using patches; when changes risk breaking behavior, the agent must ask the user to confirm before applying.
- When `ADVICE-ONLY` is active, the agent may suggest changes but must not modify files.

Project-specific constraints
- Do NOT remove or rename `CNAME` without explicit owner approval — doing so can break the published domain.
- Do NOT change contact information in `README.md` (email, LinkedIn, resume links) without confirmation from the repo owner.

PR & commit style
- Small, focused commits. PR title format: `site: <short change summary>` (e.g., `site: update bio and skills badges`).
- When changing visual/layout files, include a before/after screenshot in the PR description.

When uncertain
- If an action could affect publishing (CNAME, build config, domain), ask the repo owner before proceeding.

If anything here is inaccurate or you want a stricter enforcement policy for modes, tell me which area to tighten.
