# Code brief — Build Plan: Tejas's CBSE Class 10 study app (2026-11-14)

| | |
|---|---|
| Repo (main) | `krishnath77/build-plan` (private, new) — folder `E:\Krishnath\build-plan` |
| Branch | `build/c10-v1`; merge to `main` when every test passes |
| Second repo (small change only) | `krishnath77/flight-plan` — folder `E:\Krishnath\flight-plan`, branch `shared/c10-rules`. Only `firestore.rules`, `tests/rules/`, and one line in `firebase.json` |
| Read only these | this brief; `docs/reference/` in this repo (`c10-subjects.js`, `c10-chapters.js`, `c10-phases.js`, `theme.md`); the Class 12 app's code in `E:\Krishnath\flight-plan` (`src/`, `functions/`, `tests/`, root config files) as the code to copy |
| Out of scope | Anuj's data, Anuj's `askClaude` function, his Physics papers and question bank (`papers/`, `data/qbank/`), any AvaTrita repo or Firebase project, web research |
| Script does / Claude does | Firebase CLI creates the hosting site, runs emulators and deploys the new function and the preview · Claude copies the Class 12 app, swaps the data and theme, adds AI-written briefs, writes rules and tests |

## Goal

Build Plan is a study planner for **Tejas**, CBSE Class 10, board exam Phase 1 from **17 Feb 2027** (Maths 17 Feb, Science 22 Feb, English 26 Feb, French 6 Mar, Social Science 8 Mar). It is a copy of Anuj's working Class 12 app, Flight Plan (`flight-plan-e41e4.web.app`), with the same features and plan logic. It gets Class 10 subjects, chapters and dates, an original blocky pixel-art theme, and chapter briefs that the app writes itself through the AI function the first time each one is needed.

Decisions already made by Krishnath (14 Nov 2026): a **separate repo and separate app**, hosted in the **same Firebase project** as Anuj's app (`flight-plan-e41e4`, already on Blaze, Anthropic key already stored); Maths **Standard**, English **Language and Literature (184)**, **French (018)**, no sixth subject; the AI writes the briefs; a Minecraft-*style* theme that is fully original (`docs/reference/theme.md`).

## Hard rules for the shared Firebase project

Anuj's app is live in the same project. Nothing in this build may change it.

1. **Data:** every Class 10 Firestore path starts with `apps/c10/`. The app never reads or writes Anuj's paths (`fp/`, `answers`, `mistakes`, `notes`, `reports`, `briefs`, `config`, `usage`).
2. **Rules live in one place:** `E:\Krishnath\flight-plan\firestore.rules`. Build Plan's `firebase.json` has **no** `firestore` section, so nothing deployed from this folder can touch rules or indexes.
3. **Functions:** Build Plan has its own codebase `c10` with one function, `askClaude10`. From this folder, deploy functions only as `--only functions:c10`. Never deploy, change or delete the `default` codebase (Anuj's `askClaude`).
4. **Hosting:** a new site in the same project, deployed only as `--only hosting:c10`. In Flight Plan's `firebase.json`, pin its hosting to `"site": "flight-plan-e41e4"` so its deploys can only reach Anuj's site.
5. **No plain `firebase deploy`** from either folder. Use the npm scripts from step 9. Say so in this repo's `CLAUDE.md`.
6. **The Anthropic key:** reuse the existing secret `ANTHROPIC_API_KEY` with `defineSecret`. Never read, print, set or rotate it.

## Steps (build straight through, in this order)

1. **Get both folders current.** In `E:\Krishnath\flight-plan`: `git checkout main && git pull`. In this folder: `git pull`. If Flight Plan has uncommitted changes, stop and tell Krishnath. Do not stash or discard them.

2. **Copy the Class 12 app into this repo:** `src/`, `functions/` (no `node_modules`), `tests/unit/`, `public/`, `scripts/make-icons.mjs`, `index.html`, `package.json` (rename to `build-plan`), `vite.config.js`, `vitest*.config.js`, `eslint.config.js`, `.gitignore`. **Do not copy:** `papers/`, `data/qbank/`, `scripts/qbank-assets.js`, `tests/rules/` (rules tests stay in Flight Plan), or Flight Plan's `docs/`. Keep the question-bank code (`src/qbank/`, `src/ui/pyq.js`, `src/ui/board.js`) but configure no subjects (`qbankSubjects.js` empty), so board-question screens hide themselves until a Class 10 bank is added later. Remove the Claude-version importer card. Keep the export button.

3. **Swap the data.** Replace `src/data/subjects.js`, `chapters.js` and `phases.js` with the three `docs/reference/c10-*.js` files (the new `paper` field is just a label). Replace `paperPattern.js` with a stub for the Blueprint tab that shows each subject's unit or section marks from the data, plus a line saying the question pattern comes from the 2026-27 sample papers later. Do not invent question counts. If the go-live day is after 19 Nov 2026, move `CHK.from` to the day after go-live and keep the other dates.

4. **Remove all Class 12 hard-coding.** Known places: `appstate.js` default subjects `'phy'` → `'math'`; `today.js` uses `SUBJ.phy.exam` → the first exam in `SUB_ORDER`; `sim.js` English/AI groupings → Class 10 groups (English: Reading/Writing/Grammar, First Flight prose `ff*`, First Flight poems `fp*`, Footprints `fw*`; French: skills `fr*`, grammar `fg*`, culture `fc*`; Social Science: History `h*`, Geography `g*` + `mp`, Political Science `pl*`, Economics `ec*`); `quiz.js` fallback list → math, sci, sst; `brief.js` `'chem'` label → Science chapters `s1`–`s4` say "Formulas and reactions"; `blocks.js` Physics-only step → Science numerical chapters; `pyq.js` and `answer.js` defaults `'phy'`; every prompt that says "CBSE Class 12" (`quiz.js`, `answer.js`, `hangar.js` and any other) → "CBSE Class 10 … 2027 board exam (2026-27 syllabus, current NCERT books)". Daily load chips `[5,6,7,8]` → `[3,4,5,6]`, default **4** (he is still in school until January). Then grep `src/` and `functions/` for `phy`, `chem`, `'ai'`, `Anuj`, `Class 12`, `Flamingo`, `Vistas`, `JEE`, `defence`, `sortie` and fix every hit. The plan logic (`src/logic/`) keeps working unchanged except where it names phase ids that no longer exist (`P0`, `PB`). Adapt those minimally. Update `tests/unit/plan.test.js` to Class 10 data with the same checks: every unit gets slots, nothing is planned past `PLAN_END`, higher-mark, harder and weaker chapters get more time, and each subject's revision finishes before its exam.

5. **Theme:** apply `docs/reference/theme.md`: tab names and words, rank names (in `phases.js`), palette, fonts, square bevelled cards, block-path progress, original pixel icons, and the app name **Build Plan** in the page title, PWA manifest (`short_name` "Build Plan", theme colour `#23262E`) and icons (regenerate with `scripts/make-icons.mjs` from a new original block icon). Nothing from Minecraft: not its name, logo, font, textures, sounds, characters or item art. Check text contrast at least 4.5:1, on phone width (360 px) and on laptop.

6. **Briefs written by the app** (new):
   - When a chapter or quest needs a brief and `apps/c10/briefs/{chapterId}` doesn't exist, show "Building this brief… (about a minute)" and call `askClaude10` with kind `brief`. The prompt asks for exactly the JSON that `src/ui/brief.js` renders: `{overview, pattern, link, map:[{n, i:[]}], topics:[{t, b, k:[], f:[], must:[], q:[{m,q,a}], x:[]}], asked:[], hooks:[], quick:{q:[{m,q,a}], pts:[]}}`.
   - The prompt covers: CBSE Class 10, 2027 board exam, 2026-27 syllabus, current NCERT book; subject, paper (`SUBJ.paper`), chapter name and marks; 4–8 topics; 6–10 practice questions with marks spread like the board paper and marking-scheme style answers; "asked" = typical board-question types, labelled as patterns, not claims about specific papers; `link` = one friendly line tying the chapter to games, building, gadgets or everyday life, naming no game or brand. **English literature:** themes, characters, message, poetic devices; never quote more than a few words. **French:** content in simple French with short English help lines. **Social Science:** only the board part for `h3` and `ec4`; `mp` lists the map items for History and Geography.
   - If one reply is too long, split it into two calls (overview + map + topics; questions + hooks + quick) and merge them. Check the JSON shape; retry once; then show a friendly message with a "Try again" button.
   - Save to `apps/c10/briefs/{id}` as `{...brief, by:'ai', model, createdAt}`. Wherever the Class 12 app showed the chapter's defence-tech line, show `brief.link`.
   - Admin-only in Syllabus: **Regenerate brief** (overwrites). Admin-only in Base camp: **Build all briefs now**, which builds missing briefs one at a time with progress shown, stops cleanly at the daily cap, and resumes next time. "Spotted something wrong" reports go to `apps/c10/reports`.

7. **AI function `askClaude10`** (`functions/`, codebase `c10`). Copy `askClaude.js`, `index.js`, `parse.js` and the tests, then change: export name `askClaude10`; add kind `brief` (max tokens 16000, effort medium); system line "You are a careful CBSE Class 10 teacher and board examiner…"; access from `apps/c10/config/access`; usage docs at `apps/c10/usage/{uid}_{date}`; params `C10_MODEL` default `claude-sonnet-5-5` (lower cost; Krishnath can switch it) and `C10_DAILY_CAP` default `80`; region `asia-south1`; secret `ANTHROPIC_API_KEY`. Tests add: kind `brief` accepted, the c10 access path is used, and an Anuj-only email is refused.

8. **Store adapter:** add the `apps/c10/` prefix in one place (the store/persist layer), so screens keep their Class 12 paths (`fp/state`, `answers`, …). Add a unit test that every path the app reads or writes starts with `apps/c10/`. Keep offline persistence and the one-write-at-a-time writer. The access list is `apps/c10/config/access` = `{ emails: [..], admins: [..] }`. Krishnath fills it in the console; no emails go in code or the repo.

9. **Hosting site and config.** Run `firebase hosting:sites:create build-plan-tejas --project flight-plan-e41e4`. If that ID is taken, use `build-plan-tejas-c10` and report which one you used. `.firebaserc`: default `flight-plan-e41e4`, hosting target `c10` → the site. `firebase.json`: `hosting` with `"target": "c10"` (same headers as Flight Plan minus `/qbank/**`), `functions: [{ source: "functions", codebase: "c10", ignore: [...] }]`, emulators; **no `firestore` key**. npm scripts: `deploy:fn` = `firebase deploy --only functions:c10`, `deploy:preview` = `firebase hosting:channel:deploy preview --only c10 --expires 14d`, `deploy:live` = `firebase deploy --only hosting:c10`.

10. **Rules, in Flight Plan** (branch `shared/c10-rules`). Add `listed10()` and `admin10()`, both reading `apps/c10/config/access`, and blocks under `match /apps/c10/...`: `config` read listed10, write admin10; `fp`, `answers`, `mistakes`, `notes`, `reports` read/write listed10; `briefs` read listed10, **create** listed10 only if the doc doesn't exist, update/delete admin10; `usage` no client access. **Do not change one character of the existing rules.** In `tests/rules/rules.test.js` keep every existing test unchanged and passing. Add tests: a Class 10 user can't read Anuj's paths, an Anuj-only user can't read `apps/c10/`, brief create is allowed but overwrite is refused for a non-admin, and usage is refused. Add `"site": "flight-plan-e41e4"` to Flight Plan's `firebase.json` hosting. Run Flight Plan's unit and rules tests, commit, push the branch, and merge to `main` when green. **Do not deploy the rules.** That's a command for Krishnath (it touches Anuj's live app).

11. **Tests, once:** Build Plan unit tests, functions tests and lint; Flight Plan unit and rules tests. No re-runs of a pass.

12. **Deploy (dev only):** `npm run deploy:fn` (new isolated function), then `npm run build && npm run deploy:preview`. Do **not** deploy rules, and do not deploy live hosting.

13. **Write `docs/NOW.md`** (what's built, what's pending, links) and update `README.md`. Commit and push `main`.

## Stop and ask Krishnath only if

- Flight Plan has uncommitted changes, or any existing Flight Plan test fails before you change anything.
- A step would deploy rules, deploy live hosting, change or delete anything in the `default` functions codebase, or overwrite data.
- Something would cost money beyond the existing Blaze usage.

## What Krishnath checks on screen (after his rules command and access list)

On the preview link, on his phone: sign in → Today shows Tejas's first quests → open one, and its brief builds and shows → Syllabus → French → "L5 Les médias" shows a brief → World map runs to 16 Feb → Base camp shows "Build all briefs now". Then check that Anuj's app at `flight-plan-e41e4.web.app` still opens and shows his data.

## Report back (short and raw)

- Done / not done, per step number.
- Tests: passed or failed, with counts.
- Choices made: one line each (site ID used, anything adapted in the plan logic).
- The preview link.
- **Commands for Krishnath, in order**, each with its own `cd` line: (1) deploy rules from `E:\Krishnath\flight-plan` with `firebase deploy --only firestore:rules`, (2) later, go live from `E:\Krishnath\build-plan` with `npm run build` then `npm run deploy:live`.
- End with a **short note Krishnath can paste into chat** saying what was done and what's pending.
