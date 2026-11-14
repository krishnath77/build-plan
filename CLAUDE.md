# Build Plan — repo context for Claude Code

**What this is:** Tejas's CBSE Class 10 board-exam study planner (Phase 1 exams 17 Feb – 8 Mar 2027). It is a copy of Anuj's Class 12 app, Flight Plan (`krishnath77/flight-plan`), with Class 10 data, an original blocky theme, and AI-written chapter briefs. Owner: Krishnath (not a developer: plain words, one step at a time, commands with their own `cd` line).

Both apps belong to the claude.ai project **Flight Deck**. Research, reviews and decisions happen in chat; Claude Code builds from a brief in `docs/CODE_BRIEF_*.md`.

## Shared Firebase project (`flight-plan-e41e4`): never break Anuj's app

- Class 10 data lives only under `apps/c10/` in Firestore. Never touch `fp/`, `answers`, `mistakes`, `notes`, `reports`, `briefs`, `config` or `usage` at the root.
- **Firestore rules live in Flight Plan's repo** (`E:\Krishnath\flight-plan\firestore.rules`). This repo has no `firestore` section in `firebase.json`. Rule changes go there, with tests, and are deployed by Krishnath.
- Functions: this repo's codebase is `c10` (`askClaude10`). Anuj's `askClaude` is in the `default` codebase. Never touch it.
- Hosting: target `c10`. **Never run a plain `firebase deploy`.** Use `npm run deploy:fn`, `npm run deploy:preview`, `npm run deploy:live` (live only when Krishnath asks).
- The Anthropic key is the existing secret `ANTHROPIC_API_KEY`. Never read, print, set or rotate it.

## Working rules

- Follow the brief; read only what it lists. No web research. Facts not in the repo: ask Krishnath.
- Dev first: deploy to preview. Rules and live hosting are commands for Krishnath.
- Theme: original only. No Minecraft name, logo, font, textures, sounds, characters or item art (`docs/reference/theme.md`).
- No emails, keys or personal data in the code or the repo.
- Update `docs/NOW.md` when you finish.
- End every run with a short note Krishnath can paste into chat: what was done and what's pending.

## Where things are

- App: `src/` (screens in `src/ui/`, plan logic in `src/logic/`, Class 10 data in `src/data/`). Briefs: `src/briefs.js`. Firestore prefix: `src/store.js` + `src/paths.js`.
- Function: `functions/` (`index.js`, `src/askClaude.js`, `src/data.js`, `src/paths.js`). Tests: `tests/unit/` and `functions/test/`; run `npm test` and `npm run lint`.
- Hosting site: `build-plan-tejas` (target `c10`, set in `.firebaserc`). Rules tests live in Flight Plan, not here.
- Board-question banks are not built: `src/data/qbankSubjects.js` is empty on purpose.

