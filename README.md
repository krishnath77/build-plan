# Build Plan

Tejas's CBSE Class 10 study planner for the 2027 board exams (Phase 1: Maths 17 Feb, Science 22 Feb, English 26 Feb, French 6 Mar, Social Science 8 Mar). A sister app to Flight Plan (Anuj's Class 12 app): same features and plan logic, Class 10 data, an original blocky pixel-art theme, and chapter briefs that the app writes itself through an AI function the first time each one is needed. It shares Flight Plan's Firebase project but none of its data.

- Context for Claude Code: `CLAUDE.md`
- Current status: `docs/NOW.md`
- Build brief: `docs/CODE_BRIEF_build-plan-c10_20261114.md`
- Class 10 data and theme guide: `docs/reference/`

## What it is

| Tab | What it does |
|---|---|
| Today | Today's quests, a path of blocks to the next exam, the "where you see this" line of the chapter |
| World map | The plan from 19 Nov 2026 to 16 Feb 2027, daily load (3 to 6 quests, default 4), special days, rebuild |
| Syllabus | Every chapter with its brief (built on first open) |
| Blueprint | Where each paper's 80 marks sit, by unit (question patterns come from the 2026-27 sample papers later) |
| Training | Starting check, written-answer marking by photo, recall, mistake log |
| Inventory | Quick cards and briefs per chapter |
| Base camp | Progress, radar, preboard results, export; admin: build all briefs, account |

## Run and test

```powershell
cd E:\Krishnath\build-plan
npm install
cd functions
npm install
cd ..
npm test          # unit tests for the app and the function
npm run lint
npm run build
```

The dev server (`npm run dev`) fetches the Firebase web config from the deployed Hosting site, so it needs the preview or live site to exist.

## Where the data lives (shared Firebase project `flight-plan-e41e4`)

- Everything this app reads or writes is under `apps/c10/` in Firestore. The prefix is added in one place, `src/store.js` (with `src/paths.js`); screens keep short paths such as `fp/state` or `answers`. `tests/unit/store.test.js` checks it.
- Access list: `apps/c10/config/access` = `{ emails: [..], admins: [..] }`, filled in by Krishnath in the Firebase console. No emails live in the code.
- Rules live in Flight Plan's repo (`firestore.rules`, blocks under `match /apps/c10/...`). This repo has no `firestore` section in `firebase.json` and cannot change rules or indexes.
- Function: codebase `c10`, one function `askClaude10` (region `asia-south1`, secret `ANTHROPIC_API_KEY`, params `C10_MODEL` default `claude-sonnet-5-5` and `C10_DAILY_CAP` default 80). Briefs are kind `brief`.
- Hosting: site `build-plan-tejas` (target `c10`).

## Deploy (never a plain `firebase deploy`)

```powershell
cd E:\Krishnath\build-plan
npm run deploy:fn        # functions:c10 only
npm run build
npm run deploy:preview   # preview channel on the c10 site, expires in 14 days
npm run deploy:live      # live hosting on the c10 site; only when Krishnath asks
```

## Briefs

A chapter or quest that needs a brief with none saved shows "Building this brief… (about a minute)" and calls `askClaude10` once (two smaller calls if the first reply is cut short). The result is saved at `apps/c10/briefs/{chapterId}` as `{...brief, by:'ai', model, createdAt}`. Anyone on the access list can create a missing brief; only an admin can regenerate one (Syllabus) or use **Build all briefs now** (Base camp), which stops cleanly at the daily cap and resumes next time.

## Not built yet

Board-question banks (the code is kept; `src/data/qbankSubjects.js` is empty so those screens hide themselves), Blueprint question patterns, preboard dates, the days between exams, the optional May second exam.
