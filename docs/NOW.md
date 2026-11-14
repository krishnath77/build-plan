# Build Plan — now (updated 2026-11-14, Claude Code)

**Status:** built and on a preview link. Not live. Waiting on Krishnath's rules command and access list before anyone can sign in.

## Links
- Preview (expires 2026-11-28): https://build-plan-tejas--preview-peobpn5c.web.app
- Live site (nothing released yet): https://build-plan-tejas.web.app (site `build-plan-tejas`, hosting target `c10`)
- Brief: `docs/CODE_BRIEF_build-plan-c10_20261114.md` · Theme guide: `docs/reference/theme.md` · Repo guide: `README.md`
- Anuj's app (untouched): https://flight-plan-e41e4.web.app

## Built (brief steps 1–13)
- Copy of the Class 12 app with Class 10 subjects, 94 chapters, phases (check 19–21 Nov, build 22 Nov–31 Dec, papers Jan, fast-track 1–10 Feb, final week 11–16 Feb) and the five exam dates. Plan ends 16 Feb.
- Daily load 3 to 6 quests, default 4. Special days: preboard, practical, school (half days) and day off.
- Briefs written by the app through `askClaude10` on first open; admin Regenerate (Syllabus) and Build all briefs now (Base camp, stops at the daily cap).
- Data under `apps/c10/` only (prefix added in `src/store.js`); test checks every path. Access list `apps/c10/config/access`.
- Function `c10:askClaude10` deployed (asia-south1, secret `ANTHROPIC_API_KEY`, model `claude-sonnet-5-5`, cap 80 a day; settings in `functions/.env`).
- Original blocky pixel-art theme, new app icon, Blueprint tab built from the chapter data, board-question screens hidden (no bank yet).
- Tests: Build Plan 105 passed (plan 20, store 5, briefs 25, theme and contrast 41, function 14), lint clean. Flight Plan: 37 unit and 17 rules passed.

## Pending: Krishnath
1. Deploy the rules from Flight Plan (command in the Code report). Until then nobody can sign in to Build Plan.
2. Create `apps/c10/config/access` in the Firebase console: `{ emails: [..], admins: [..] }` (lower-case emails, Tejas and yourself, you as admin).
3. If Google sign-in says the domain is not authorised: Firebase console, Authentication, Settings, Authorized domains, add `build-plan-tejas.web.app` and the preview domain `build-plan-tejas--preview-peobpn5c.web.app`.
4. Check the preview on your phone (checklist in the brief), then check Anuj's app still opens with his data.
5. Go live only when ready: `npm run build`, then `npm run deploy:live` from `E:\Krishnath\build-plan`.
6. If go-live is after 19 Nov 2026, tell Code: the starting check moves to the day after go-live (`PH` in `src/data/phases.js`).

## Pending: Flight Plan repo
- The rules change is committed on branch `shared/c10-rules` in `E:\Krishnath\flight-plan` (rules, 8 new rules tests, hosting pinned to site `flight-plan-e41e4`). Pushing that branch and merging it to `main` was blocked by the permission check in this session, so it is not on GitHub yet.

## Later
- School preboard dates as special days; Blueprint question patterns from the 2026-27 sample papers; board-question banks per subject (add folders and list them in `src/data/qbankSubjects.js`); plan for the days between exams; optional May second exam.
- Verify against the official CBSE 2026-27 PDFs: Science Heredity (in or out), chapter-level marks (unit totals are CBSE's, chapter splits are estimates), and the Social Science map-work items and board parts of `h3` and `ec4` (the brief prompts say what to include; the AI writes the detail, so spot-check those briefs).
- Mid-rebuild edge: a rebuild during the 3-day starting check re-spreads the check blocks over the days left (same as Class 12 behaviour, noted).
