# Next.js Code Structure Guidelines

Authoritative rules for code organization in the live Next.js App Router codebase. Apply to all route hosts and shared layers. Do not re-evaluate these decisions per session.

**Loaded by:** `AGENTS.md`, `NEXTJS_MIGRATION_STATUS.md`

**Companion reference:** `README.md` is the maintained map of the live codebase shape. Use this file for rules; use the README for what currently exists and where shared files belong.

---

## Size Limits

### App Router (`app/`)

| File type | Aim | Hard cap | At cap: required action |
|-----------|-----|----------|------------------------|
| Route entry (`app/**/page.js`) | 30L | 80L | Logic is leaking into the Server Component — move it to `[Name]Page.js` |
| Route client host (`app/**/*Page.js`) | 350L | 500L | Extract component or hook before adding more code |
| Root layout (`app/layout.js`) | 60L | 120L | Extract providers or shell wiring to a dedicated wrapper component |
| App-local helper (`app/**/[^.]*.js`, excluding `page.js`, `layout.js`, `route.js`, `*Page.js`) | 200L | 300L | Extract the child concern or move reusable logic to `components/`, `hooks/`, or `lib/` |

**`page.js` ownership rule:** A route entry file may only contain: `metadata` export, `viewport` export, and a single `return <[Name]Page />` render. No hooks, no state, no logic. If it needs to pass props to the client host, those props must be derivable server-side without any browser APIs or React state.

### Shared layers

| File type | Aim | Hard cap | At cap: required action |
|-----------|-----|----------|------------------------|
| Component (`components/*.js`) | 200L | 300L | Split into two components before adding more code |
| Hook (`hooks/use*.js`) | 100L | 150L | Split by concern before adding more code |
| Lib (`lib/*.js`) | 300L | 450L | Apply cohesion check (below) before adding more code |
| CSS Module (`*.module.css`) | 350L | 500L | Extract the component that owns the large CSS section |
| `styles/globals.css` | — | 100L | Hard stop — CSS variables + reset only, no exceptions |

### Bundle size monitoring

These are performance signals, not ownership rules. Route size does not decide where code belongs, but it does decide when profiling and reduction work must happen.

**Official guidance first:** Next.js and Vercel treat first-load JS as a budget to minimize, not something apps should casually exceed. Treat the commonly cited ~170 KB compressed target as the official performance signal. Do not claim that PT Tracker is exempt because it is “more complex than most apps” or because it uses Supabase. If a route remains above budget, the burden is on us to show what is in the bundle, what can be reduced now, and what explicit tradeoff we are accepting.

**Current repo evidence (2026-03-29):**
- Route baselines from `npm run analyze:bundle` (full web analyzer plus `.next/diagnostics/route-bundle-stats.json` output):
  - `/_not-found`: `520,901` bytes first-load uncompressed
  - `/`: `866,049`
  - `/pt-view`: `810,740`
  - `/program`: `769,822`
  - `/rehab`: `752,734`
  - `/reset-password`: `620,980`
- The shared floor is therefore about `521 KB` uncompressed before route-specific code.
- Every current user-facing route is above the official budget signal today, and the shared floor alone nearly consumes that budget before route-specific code is added.
- Analyzer module pass (`.next/diagnostics/analyze/data/modules.data`) found `114` Supabase-related client modules in the current client graph:
  - `auth-js`: `57`
  - `realtime-js`: `36`
  - `functions-js`: `9`
  - `supabase-js`: `6`
  - `postgrest-js`: `3`
  - `storage-js`: `3`
- Current app-code evidence points to one shared browser client in `lib/supabase.js` plus IndexedDB-backed auth storage in `lib/offline-cache.js`, with clear heavy `supabase.auth` usage and one explicit realtime channel in `hooks/useMessages.js`.
- Most app reads already go through `/api/*` handlers. In the browser app surface, the clear direct Supabase needs today are auth and one realtime subscription, not direct storage or edge-function usage.
- Source review plus module-graph extraction now show the same constraint from two angles: `@supabase/supabase-js` constructs auth, realtime, storage, functions, and PostgREST clients together, and `npm run analyze:modules -- --term createBrowserClient` shows `@supabase/ssr/dist/module/createBrowserClient.js` pulling those same sub-clients directly in the app-client and client builds. Treat that as a real constraint: bundle reduction will not come from hand-waving about “modular imports” while the app still converges on one shared `createBrowserClient()` / `supabase-js` browser foundation.

| Trigger | Action |
|---------|--------|
| Route or shared floor materially exceeds official budget guidance | Run `npm run analyze:bundle`, identify the exact shared and route-specific sources, and record the findings before merge |
| Route regresses materially from its recorded baseline | Investigate before merging — find the exact import chain or feature that increased first-load JS |
| Shared floor is carrying packages or sub-clients the app does not clearly need on first load | Treat as active reduction work, not a hand-waved “complex app” exception |

**Current reduction candidates from first principles:**
- Move auth to the approved `@supabase/ssr` foundation so the protected-route boundary no longer depends on the same client-only singleton shape.
- Isolate or narrow realtime usage if the message badge/subscription does not need to ride the default shared browser client on every route.
- Prefer route/API data reads over browser-SDK reads when that keeps heavy client libraries out of the first-load path.

Keep command usage out of this structure doc. For the current analyzer commands, required flags, Windows `--root` handling, helper-script output, and commit preflight usage, use [`SCRIPTS_GUIDE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/SCRIPTS_GUIDE.md).

**At or above cap:** Must resolve before adding more code. No exceptions.

**Between aim and cap:** Acceptable only when ownership is still clear and cohesive. Being under the cap is not permission to keep independently changeable concerns mixed together.

**When no clean split exists:** Do not violate the cap unilaterally. Surface to the user: state the file size, the cap, and why no clean split is apparent. Wait for a decision.

---

## Core Principle (Why These Rules Exist)

One file = one complete concern — not one file = smallest possible file. When an agent makes a change, it loads every file needed to understand the context. Two files that are always loaded together are worse than one moderate file. The right split is along true domain boundaries: things used independently belong in separate files; things always loaded together belong in one file. Caps exist to catch files that have grown beyond one concern, not to force artificial fragmentation.

This codebase is maintained heavily by AI agents. Assume the entire codebase will continue to be managed by unknown future agents who do not share the current session's memory or rationale. Even when the future agent is still "Codex" or "Claude," it may be a different model release, different prompt environment, or different operating context with different defaults and blind spots. Optimize for narrow ownership boundaries that let a future agent load the fewest files necessary, understand quickly what a file owns, and make a change with low collateral risk. A file being under the hard cap does not justify keeping multiple independently editable concerns together.

Why this matters here: broad mixed files are easier for agents to break accidentally. When filters, notes handling, modal glue, derived display shaping, and route orchestration live together, a future edit has to load and reason about all of them at once. That increases the chance of collateral changes, hidden regressions, duplicate logic, and timid maintenance where agents avoid cleanup because the file feels too risky to touch. Clear ownership boundaries reduce those risks.

---

## Responsibility-First Placement

Use [`RESPONSIBILITY_FIRST_PLACEMENT.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/RESPONSIBILITY_FIRST_PLACEMENT.md) for the short canonical wording of the pre-edit ownership test. Keep this structure doc focused on layer, cap, and split rules; use the companion doc for the fast "does this change belong here?" decision.

---

## Cohesion Check (Apply Before Any Split)

Do not treat a file as cohesive just because you can describe it with one broad umbrella phrase. The real standard is whether the file contains independently changeable concerns that future agents would benefit from editing separately.

Ask:
- Would a future agent reasonably want to change this part without changing the rest?
- Does this responsibility have its own lifecycle, side effects, UI surface, or data-shaping rules?
- Would extracting it reduce collateral reasoning and editing risk for future work?

If yes, that is evidence the file may need extraction even if the contents sound related at a high level.

**Filename domain test:** Before adding a function to an existing file or before splitting a file, ask:

> "Would I need to rename this file to accurately describe what it contains after adding this?"

- If **yes** → the addition does not belong here. Place it in a different file.
- If **no** → the file is still one domain. Continue.

**File header comment is a contract:** Every file must have a 1-line header comment describing its domain. The comment must accurately reflect the file's actual contents. If writing the comment would require joining two different feature areas, the file must be split.

| Header comment | Verdict |
|----------------|---------|
| `// lib/pt-view.js — fetches logs, programs, messages; transforms for display` | ✓ commas OK — all pt-view data |
| `// lib/pt-view.js — fetches pt-view data, handles email sending` | ✗ email ≠ pt-view domain → move `sendEmail` to `lib/email.js` |
| `// lib/pt-view.js — pt-view AND email data` | ✗ two domains — split |
| `// lib/pt-view.js — general data utilities` | ✗ vague — avoids the test; must rewrite the comment to be accurate or split |

---

## Split Decision Rules (Apply in Order)

1. **Is a cap violated?** → Must split (or surface to user if no clean split)
2. **Does the cohesion check fail?** → Must split regardless of size
3. **Would the split pieces always be loaded together?** → Do NOT split (artificial fragmentation)
4. **Is the file under cap and cohesion OK?** → Only keep it together if the contents are still best understood and changed as one concern

Do not split to reach the aim number. A 350L lib covering one domain is correct. A 150L lib mixing two domains must split. Likewise, a page or hook under cap must still split if doing so would create clearer ownership for future agent maintenance.

---

## Import Layer Rules

### App Router

| Layer | May import from |
|-------|----------------|
| `app/**/page.js` (Server Component) | `app/**/*Page.js` only — no hooks, no lib, no components directly |
| `app/**/*Page.js` (`'use client'`) | `components/`, `hooks/`, `lib/`, own CSS module |
| `app/layout.js` (Server Component) | `styles/globals.css`, `app/components/` — no hooks, no `lib/` data functions |
| `app/components/` and route-local helpers such as `TrackerRouteShell.js` | same rules as `components/` when UI-only; otherwise extract reusable state to `hooks/` or pure shaping to `lib/` |

### Shared layers

| Layer | May import from |
|-------|----------------|
| `components/` | other `components/`, own CSS module — no `lib/`, no `hooks/`; all data arrives via props |
| `hooks/` | React, `lib/` only |
| `lib/` | `lib/supabase.js`, `lib/utils.js` (create when first needed) only — no React, no hooks, no other lib files |
| `styles/globals.css` | nothing |

An import outside these rules signals misplaced responsibility. Fix the placement, not the import.

---

## Folder Structure

App Router routes live in `app/`. The `pages/` directory is no longer a routing surface in this repo; it is an empty compatibility directory kept only because current Next dev tooling still probes for `pages/` during startup.

```
├── app/                # App Router routes and framework-owned route entries
│   ├── layout.js       # Root layout — shell, globals.css, analytics, registrar
│   ├── components/     # App-shell-only helpers such as the registrar
│   ├── sign-in/
│   │   ├── page.js     # Server entry — metadata + renders SignInPage
│   │   └── SignInPage.js
│   ├── reset-password/
│   │   ├── page.js
│   │   └── ResetPasswordPage.js
│   ├── (protected)/
│   │   ├── layout.js   # Protected route gate + warmers
│   │   ├── page.js     # Tracker route entry
│   │   ├── TrackerPage.js
│   │   ├── TrackerRouteShell.js
│   │   ├── TrackerOverlays.js
│   │   ├── pt-view/
│   │   │   ├── page.js
│   │   │   └── PtViewPage.js
│   │   ├── rehab/
│   │   │   ├── page.js
│   │   │   └── RehabPage.js
│   │   └── program/
│   │       ├── page.js
│   │       └── ProgramPage.js
│   └── api/            # App Router route handlers
│
├── pages/              # Empty compatibility directory only; do not add route code
│   └── .gitkeep
│
├── components/         # UI components — shared or self-contained (modals, nav)
│   ├── NavMenu.js      # Used on every page
│   ├── AuthForm.js     # Used on every page
│   ├── [Name].js
│   └── [Name].module.css  # CSS Module lives next to its component
│
├── hooks/              # Custom React hooks — state + effects, no JSX
│   ├── useAuth.js      # Used on every page (session management)
│   └── use[Name].js
│
├── lib/                # Pure data functions — no React, no hooks
│   ├── supabase.js     # Shared lazy proxy over the browser Supabase client singleton
│   ├── supabase-browser.js # Only place createBrowserClient() is called
│   ├── rehab-coverage.js   # Data functions for /rehab
│   ├── pt-view.js      # Data functions for /pt-view
│   └── utils.js        # Cross-domain utilities (date formatting, etc.)
│
├── styles/
│   └── globals.css     # CSS variables + reset ONLY — no component styles
│
├── api/                # Legacy API surface being retired in favor of `app/api/*`
├── public/             # Static assets, manifest, and remaining legacy public files
└── docs/               # Documentation — not loaded at runtime
```

**Placement decisions:**
- New UI piece with state or reuse → `components/` or a route-local helper under `app/` when it only belongs to one App Router surface; otherwise inline in a route client host only if it stays below the inline limits below
- New data function → `lib/[domain].js`
- New state + effects logic reused ≥2 routes/components → `hooks/use[Name].js`; otherwise inline in a route client host if ≤20L and still clearly route-local
- New styles → CSS Module next to the JS file it belongs to; CSS variables → `styles/globals.css` only

---

## Server and Client Boundary Rules

App Router adds an explicit server/client split. Treat that split as an ownership rule, not just a syntax rule.

**Default:** keep `app/**/page.js` and `app/layout.js` as Server Components.

Add `'use client'` only when the file needs one of these:
- React client hooks such as `useState`, `useEffect`, `useRef`, or `useMemo`
- event handlers such as `onPointerUp`, `onChange`, or `onKeyDown`
- browser APIs such as `window`, `document`, `localStorage`, `matchMedia`, or service worker access
- client-only shared hooks such as `useAuth`, `useMessages`, or other state/effect hooks

Keep a file server-side when it is pure display or server-safe wiring:
- metadata/viewport exports
- rendering static or derived markup from props
- route entry files that only delegate to a route-local client host

**Push `'use client'` down the tree.** Do not mark a route entry or layout as client-side just because one child needs interactivity. Put the client boundary on the smallest practical host component and keep surrounding structure server-side.

**Route pattern for this repo:**
- `app/**/page.js` = thin Server Component route entry
- `app/**/[Name]Page.js` = route-local client orchestrator when the route is interactive
- `components/` = shared interactive or presentational building blocks under that host

If a future edit would force `'use client'` onto `app/**/page.js`, pause and ask whether the interactive concern belongs in a route-local `*Page.js` or a deeper child component instead.

---

## What Next.js Enforces Vs What The Repo Still Enforces

Next.js gives this repo better guardrails than the old mixed static/Pages Router shape, but it does not fully enforce the architecture by itself.

Use this section when the question is:
- "Will the framework catch this for me?"
- "What still needs repo rules or review discipline?"
- "What can we eventually automate with hooks, scripts, or CI?"

### 1. Framework-enforced boundaries

These are the things Next.js and the build system already help enforce:

- `app/**/page.js`, `app/**/layout.js`, and `app/**/route.js` have distinct framework jobs
- Server and client boundaries are explicit through `'use client'`
- browser-only APIs cannot run safely in Server Components
- duplicate route ownership and invalid route shapes often fail at build time
- `app/` route structure makes route ownership more obvious than large mixed files did

Examples:
- Putting stateful React hooks in a Server Component will fail
- Defining the same path in conflicting ways can fail the build
- Route handlers and route pages already live in clearly different framework slots

### 2. Repo-enforced architecture rules

These rules are still ours to enforce even when the code is technically valid:

- `app/**/page.js` must stay a thin route entry, not a feature host
- route client hosts such as `*Page.js` are orchestrators, not dumping grounds
- business logic belongs in `lib/`, not in route files or UI components
- state/effect workflows belong in focused `hooks/`, not in route entries
- reusable UI belongs in `components/`, not copied inline across routes
- domain data must not become new hardcoded option lists without explicit sign-off

Examples:
- A `page.js` file that imports data helpers, hooks, and large JSX blocks might still compile, but it is architecturally wrong here
- A client host may be under the line cap and still own too many unrelated concerns
- A route can technically add a second mutation path inline even when a shared mutation hook already owns that concern

### 3. What can be automated later

Some repo rules are good candidates for mechanical enforcement:

- fail if `app/**/page.js` imports hooks, `lib/`, or shared components directly instead of delegating to a route host
- fail if `app/**/page.js` contains hooks, local state, or non-trivial logic
- fail if active route files reappear under `pages/` instead of staying in `app/`
- warn or fail when route hosts, hooks, or shared files exceed agreed caps
- warn when banned layer imports appear, such as React hooks inside `lib/`

These are strong candidates for a future structure-check script, pre-commit hook, or CI rule.

### 4. What still needs human or agent judgment

Some architecture decisions remain partly judgment-based even with good automation:

- whether a concern is truly one domain or two concerns mixed together
- whether a helper belongs in a route host, hook, component, or `lib/`
- whether a feature request is "small UI" or actually a shared write path
- whether deferring a decision is harmless scope control or the start of another rebuild later

Examples:
- "Add dosage edit to tracker" sounds small, but it is really a shared program-data write path
- "We can defer history/versioning/soft-delete work" may sound reasonable, but those are often foundation decisions rather than polish

### Operator shortcut

When evaluating agent work, use this quick test:

- If the framework/build fails, that is a hard boundary problem
- If the change compiles but puts the wrong kind of code in the wrong layer, that is still a real problem here
- If the change introduces a second ownership path for shared data, treat it as architecture work, not a convenience tweak

In short: Next.js catches more than the old structure did, but it does not replace the repo's ownership rules. The framework helps us see boundaries sooner; it does not decide all boundaries for us.

## README Maintenance (Required)

`README.md` is the landing reference for the current architecture. Keep it aligned with the live codebase.

Update `README.md` in the same change when any of the following happen:

- A shared Next.js file is added, removed, renamed, or repurposed in `app/`, `components/`, `hooks/`, or the Next.js-layer files in `lib/`
- A page-to-legacy mapping changes, including cutover, retirement of an old HTML page, or a new redirect path
- Cleanup or refactor work changes which file owns a concern that other agents need to locate quickly
- Timer/audio/logger wiring changes enough that the ownership map in the README would become misleading

Minimum maintenance expectations:

- Update the relevant section entry rather than leaving the old file listed
- Keep “when to use it” guidance factual and brief
- Distinguish Next.js shared utilities from legacy API-layer files
- If the README would need a major rewrite because the architecture has changed substantially, back it up first before overwriting it

---

## Route Client Hosts (`app/**/*Page.js`)

**Aim: 350L. Hard cap: 500L.**

**Default role: route client host as orchestrator.** For AI agents, assume a `*Page.js` file should coordinate route flow rather than own large feature sections. A good route client host wires auth-derived route state, shared hooks, and major components together. It should not become the main home for feature-specific UI or mutation logic once those concerns are large enough to stand on their own.

**Agent-maintainability rule:** Prefer the structure that makes future agent edits safest and most local. If filters, notes handling, modal glue, or a route-only panel could reasonably be changed, debugged, or extended on their own, they should not stay mixed in the route client host just because the file is still under the cap. Treat ownership clarity as the limit; treat the cap as a backstop.

Practical test: compare the amount of behavior a route client host coordinates with the amount of code it contains. If a modest route file is approaching the size or complexity of a much broader route, that is usually evidence that too many independently maintainable concerns are still mixed together.

**AI decision shortcut:** If a JSX block feels like its own workspace, panel, modal launcher, task area, or independently maintainable route section, extract it to `components/` or a route-local helper. If a stateful behavior feels like its own mutation flow, queue lifecycle, form workflow, persisted UI-state concern, or note/filter processing concern, extract it to `hooks/`. Keep the route client host focused on composing those pieces.

Examples for agents:

- Keep in the route client host:
  - route-level auth-driven branching handed down from the server entry/layout
  - route-level tab state
  - deciding which modal is open
  - passing the selected exercise into child components
  - composing shared child components such as `<ExercisePicker />`, `<HistoryPanel />`, and `<Toast />`
- Extract from the route client host:
  - a full "Manage Patient Dosages" workspace with its own selector, banner, summary card, and action button
  - a full "Assign Roles to Exercises" workspace with its own selector and management UI
  - a mutation hook that handles exercise saves, dosage writes, role writes, and vocabulary writes all in one file once it nears the hook cap

Concrete repo example:

- [`app/(protected)/TrackerPage.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/TrackerPage.js) is the model to follow for the main tracker surface. It stays as the route orchestrator while substantial UI and workflow concerns live in focused hooks, components, and route-local helpers.
- [`app/(protected)/program/ProgramPage.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/program/ProgramPage.js) follows the same pattern for the program editor: route orchestration in the client host, substantial editor workspaces in `components/`, and focused mutation/state concerns in `hooks/`.

**Reusable subsystem rule:** If a feature can be hosted from more than one route, keep the feature subsystem extracted even when one route is its primary home. For example, the exercise editor should stay in shared components/hooks because it historically appears from both the tracker flow and the dedicated editor flow. Do not move that subsystem back into a route client host just because one route currently hosts it most often.

**Contains:**
- `useAuth()` call and route bootstrap wiring
- `useEffect` for initial data load
- Route-level `useState` (filters, loading, error, data)
- JSX layout: header, main sections, modal invocations
- Small inline sub-components meeting the inline rule below

Good route-host question: "If a future agent only needed to change this one panel, one persisted UI-state behavior, or one note/filter rule, could they do it without loading the whole route client host?" If the honest answer is no, the file still owns too much.

**Must not contain:** business logic, API calls, or hooks with complex state — those go in `lib/` and `hooks/`.

**Inline sub-component rule.** A function like `function SummaryStats({ ... })` may stay in a route client host only if ALL four conditions are met:
1. Used only on this one route
2. Has no state of its own (reads parent state via props only)
3. < 40 lines of JSX
4. Its CSS is < 30 lines in the route CSS module

If any condition is false → extract to `components/`.

| Example | Decision |
|---------|----------|
| `function SummaryStats({ totalSets })` — 15L JSX, no state, route-only | ✓ stay inline |
| `function PatientNotes({ notes })` — has own `isCollapsed` state | ✗ extract to `components/PatientNotes.js` |
| `function HistoryList({ logs })` — 80L JSX | ✗ extract (over 40L limit) |

---

## Components (`components/`)

**Aim: 200L. Hard cap: 300L.**

**Always extract (no exceptions):**
- Any modal or overlay
- Any UI used on ≥2 pages or ≥2 components
- Any JSX block with its own state (`useState`/`useEffect`)

**File naming:** PascalCase noun — `MessagesModal.js`, `NavMenu.js`

**Must have:** paired `ComponentName.module.css` in the same folder.

**Must not contain:** API calls, business logic, or calculations. All data arrives via props.

---

## Hooks (`hooks/`)

**Aim: 100L. Hard cap: 150L.**

**One concern per file.** `useAuth` = auth only. `useMessages` = messages only. Never merge two unrelated concerns.

**File naming:** `use` + PascalCase concern — `useAuth.js`, `useMessages.js`

**Required patterns:**
- Cleanup on unmount: return a cleanup function from any `useEffect` that sets an interval, listener, or subscription
- `localStorage` reads in `useState` initializer (not `useEffect`) with `typeof window !== 'undefined'` guard
- Return a named object (`{ messages, send, archive }`), not a bare array

---

## Lib (`lib/`)

**Aim: 300L. Hard cap: 450L.**

**Pure functions only.** No React imports, no hooks, no side effects outside the returned value.

**One domain per file.** When a lib file hits its cap, apply the cohesion check: if all functions are one domain (e.g., all rehab coverage), add `// NOTE: cohesive domain — [N] functions all serve [domain]` and document the decision. Only split if sub-domains exist and would be loaded independently:
- API fetchers: `lib/[domain]-data.js`
- Pure calculations: `lib/[domain]-calc.js`

**API call signature:** Always `(token, ...args)`. Never read session from a global or closure.

**File naming:** kebab-case domain — `pt-view.js`, `rehab-coverage.js`

---

## Styling

**Aim: 350L. Hard cap: 500L per CSS Module.**

**A growing CSS module is a symptom, not the problem.** The fix is to extract the component that owns the large CSS section — the CSS moves with the component. Do not split a CSS file without also extracting its component: that creates orphaned styles with no owner.

| Action | Verdict |
|--------|---------|
| Create `pt-view-notes.module.css`, move notes styles | ✗ orphaned CSS — no component owner |
| Extract `components/PatientNotes.js` + `components/PatientNotes.module.css` | ✓ CSS and component move together; page CSS module shrinks naturally |

**`styles/globals.css`:** CSS variables + reset only. Hard cap 100L. No component or layout styles.

**CSS Module placement:** Next to its JS file in the same folder.

**Dark mode:** `@media (prefers-color-scheme: dark)` blocks in each CSS Module. No separate dark files, no JS toggling.

**Class naming:** `styles['hyphenated-name']` or `styles.camelCase`. Conditional: `` `${styles.base} ${condition ? styles.active : ''}` ``. Inline styles only for dynamically computed values.

---

## Shared Code Rule

**Used in ≥2 places → extract immediately.**

| Used in | Extract to |
|---------|-----------|
| ≥2 routes | `components/` (UI), `lib/` (logic), or `hooks/` (state) |
| ≥2 components | `components/` (UI) or `lib/` (logic) |
| 1 place only | Stay inline until second use |

Extract on the second use, not the third.

---

## File Header Comments (Required)

Every route client host, route-local helper, component, hook, and lib file in `app/`, `components/`, `hooks/`, and `lib/` must start with a 1-line comment:

```js
// lib/pt-view.js — pure data functions for the pt-view history dashboard
// components/MessagesModal.js — slide-up messages panel with compose and archive
// hooks/useMessages.js — polls for messages every 30s; send, archive, markRead
```

Commas listing same-domain operations are fine. The comment is a domain contract — it must accurately describe the file's actual contents. Scan the first line to determine a file's domain without loading the full file.

When a new shared file is created and added to the README, make sure the file header and the README entry agree about what the file owns.

---

## Decision Examples

**Adding a function to lib:**
- Adding `sendEmailNotification()` to `lib/pt-view.js` → ✗ wrong file; email ≠ pt-view data domain → create `lib/email.js`
- Adding `computeDaysStreak()` to `lib/pt-view.js` → ✓ correct; it's a pt-view data transformation

**Extracting a component:**
- `PatientNotes` section in `pt-view.js`: 60L JSX with own expand/collapse state → ✗ not inline-eligible (has state + over 40L) → extract to `components/PatientNotes.js` + `PatientNotes.module.css`

**When NOT to split:**
- `MessagesModal.js` (~272L) contains list, compose, roll-up/restore, and undo-send — ✗ do not split; they are always loaded together; one file is correct
- Apply Split Decision Rule 3: would split pieces always be loaded together? Yes → keep as one file

**Reuse trigger:**
- Inline `useLocalFilter` hook (15L) exists in `pt-view.js`; Phase 3 `pt-editor.js` needs the same logic → extract to `hooks/useLocalFilter.js` immediately on second use

---

## Function Naming

Exported functions: verb + noun.
- `fetchLogs` not `getLogs` or `logs`
- `computeSummaryStats` not `getSummaryStats`
- `applyFilters` not `filter`
- `groupLogsByDate` not `groupLogs`

Internal helpers may be shorter: `toLabel`, `isUrgent`.

---

## Event Handlers

**`onPointerUp` not `onClick` for interactive elements.** iOS Safari requirement — non-negotiable. Applies to: buttons, card taps, overlay close handlers, divs acting as buttons.

Correct for non-touch targets:
- `onChange` on `<input>`, `<select>`, `<textarea>`
- `onKeyDown` for keyboard shortcuts (e.g., Enter-to-send)

---

## What Must Not Happen

- `window.*` globals — use props, hooks, or module constants
- `createBrowserClient()` outside `lib/supabase-browser.js`
- `useRef` for DOM manipulation that CSS or state can handle
- Redux, Zustand, or React Context — session is managed by Supabase
- TypeScript
- `console.log` in committed code
- Splitting a CSS file without extracting the corresponding component

---

## Guideline Conflicts — When to Surface to the User

If you encounter a situation where following a guideline as written would produce clearly wrong code — or where the guideline itself appears to be the problem rather than the file — **stop and surface it to the user**. Do not silently bend the guideline or silently bend the file.

**When to surface:**
- A rule requires a split but all valid split points violate another rule (e.g., import layer rules prevent lib-imports-lib)
- A cap is hit but every possible split would create two files that are always loaded together (artificial fragmentation)
- A rule as written doesn't fit the situation and you believe the rule needs updating, not the code

**How to surface:**
1. State the specific rule and the specific file
2. State why following the rule produces the wrong outcome
3. Propose what the rule should say instead, OR ask the user for a decision
4. Wait for confirmation before proceeding

This is not a workaround — it is the intended escalation path. The guidelines exist to serve the codebase; when they don't, fix the guidelines.

---

## Required Fixes — Pre-Existing Files Needing Attention

These files were written before this document existed. Files over cap must be brought within cap before they are extended. Files within cap are listed for awareness — they will shrink naturally as components are extracted. This is a separate task from creating this document.

| File | Lines | Cap | Status |
|------|-------|-----|--------|
| `lib/rehab-coverage.js` | 588→588 | 450L | ✓ Fixed (DN-035): cohesive domain confirmed; `// NOTE: cohesive domain` added; import layer rules prohibit split |
| `pages/pt-view.module.css` | 670→369 | 500L | ✓ Fixed (DN-035): PatientNotes + HistoryList extracted to components/ |
| `pages/rehab.module.css` | 478 | 500L | Within cap — shrinks naturally when components below are extracted |
| `app/(protected)/program/ProgramPage.js` | current route client host | 500L | Keep under the route-host cap; interactive editor surface |
| `app/(protected)/TrackerPage.js` | current route client host | 500L | Keep under the route-host cap; heaviest interactive surface |
