# Commit Message Specification

All commits in this repo must follow the Conventional Commits format with a mandatory Beads issue ID and commit body.

## Format

```
<type>(<scope>): <description> (<beads-id>)

<body>

<footer>
```

### Required Fields

**Header (subject line):**
- `<type>` — commit category: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`
- `<scope>` — optional area affected (e.g., `auth`, `api`, `ui`, `layout`). Omit if the change is global
- `<description>` — lowercase description of the change (NOT what was done, but WHY it matters or what problem it solves)
- `<beads-id>` — mandatory Beads issue ID in parentheses (e.g., `(pt-abc12)`)

**Body:**
- Required for all commits
- Explain WHY the change was made, not WHAT it does (the code shows what)
- Use clear prose; sentence case is fine
- Wrap at 72 characters per line
- Minimum 10 characters (not just whitespace)
- Start with a blank line after the header

**Footer (optional):**
- `Co-Authored-By: Name <email>` trailer for agent contribution attribution
- Recognized agent emails: `noreply@anthropic.com`, `codex@openai.com`

## Character Limit: 65 Characters Total (Including Bead ID)

The usual 50-character subject guideline is relaxed in this repo because the mandatory Beads issue ID takes additional space. The subject line header has a **65-character limit** that **includes** the mandatory Beads issue ID in parentheses.

This is a hard constraint. The 65-character budget must accommodate:
1. Type (3-8 chars: `feat`, `refactor`, etc.)
2. Colon and space (2 chars: `: `)
3. Scope in parentheses (optional, e.g., `(auth)` = 5 chars + colon/space if present)
4. Description in plain English
5. Bead ID in parentheses (e.g., ` (pt-abc12)` = 11-13 chars)

### Examples

**Example 1: Minimal (no scope) — fits easily**
```
fix: handle offline timeout (pt-2b4wx)
```
Character count: `f i x :   h a n d l e   o f f l i n e   t i m e o u t   ( p t - 2 b 4 w x )` = 39 chars ✓

**Example 2: With scope — tight but valid**
```
feat(auth): add password reset (pt-k9m3c)
```
Character count: `f e a t ( a u t h ) :   a d d   p a s s w o r d   r e s e t   ( p t - k 9 m 3 c )` = 45 chars ✓

**Example 3: Narrow scope to fit description — still respects 65-char limit**
```
refactor(ui): consolidate button styling (pt-j7x2q)
```
Character count: `r e f a c t o r ( u i ) :   c o n s o l i d a t e   b u t t o n   s t y l i n g   ( p t - j 7 x 2 q )` = 54 chars ✓

**Example 4: Maximum detail — reaches the 65-char limit**
``` 
feat(offline): support cached data in offline periods (pt-wx1)
```
Character count: `f e a t ( o f f l i n e ) :   s u p p o r t   c a c h e d   d a t a   i n   o f f l i n e   p e r i o d s   ( p t - w x 1 )` = 65 chars ✓ (exactly at limit)

**Example 5: TOO LONG — exceeds 65-char limit (invalid)**
```
fix(api): restore request timeout handling for slow connections (pt-z3)
```
Character count: 73 chars ✗ (exceeds limit — must revise description or abbreviate scope)

Revised version to fit:
```
fix(api): restore request timeout for slow connections (pt-z3)
```
Character count: 58 chars ✓

## Body Guidelines

The body must explain **why** the change is needed, not what it does:

### ✓ Good — Explains motivation
```
fix: handle offline timeout (pt-2b4wx)

Offline detection was triggering too early for slow networks,
causing premature failure. Added exponential backoff for retry
logic to distinguish genuine offline from network latency.
```

### ✗ Bad — Describes what the code does
```
fix: handle offline timeout (pt-2b4wx)

Added exponential backoff retry logic in the offline detector.
Updated the timeout value from 5s to 10s.
```

### ✓ Good — Provides context
```
feat(auth): add password reset email (pt-k9m3c)

Users had no way to recover lost passwords without contacting
support. Email-based recovery is the standard pattern and
reduces support burden while improving user autonomy.
```

### ✗ Bad — Minimal or vague
```
feat(auth): add password reset email (pt-k9m3c)

Users can now reset their passwords via email.
```

## Type Guidelines

- `feat` — new user-facing feature or capability
- `fix` — bug fix or correctness improvement
- `docs` — documentation, comments, or examples (no code logic changes)
- `refactor` — code structure improvement without behavior change
- `test` — test additions or improvements
- `perf` — performance improvement (measurable)
- `style` — formatting, linting, or whitespace (no logic changes)
- `chore` — tooling, dependencies, build config, or CI changes

## Scope Guidelines (Optional)

Use a scope when the change is localized to a specific feature or area:

- `(auth)` — authentication and authorization
- `(api)` — API routes or handlers
- `(ui)` — user interface or components
- `(offline)` — offline and PWA behavior
- `(layout)` — page layout or structure
- `(test)` — test infrastructure (when combined with `test:` type)

Omit the scope for global changes (README, package.json, .gitignore, root-level config, etc.).

## Validation

Commits are validated by commitlint using the configuration in `commitlint.config.js`. Invalid commits will be rejected at pre-commit time with specific error messages.

Common validation failures:

- **Header exceeds 65 characters** — shorten the description or remove the scope
- **Body is empty** — all commits require a body explaining the change
- **Body has lines longer than 72 characters** — wrap longer lines
- **Body is too short** — provide meaningful context (minimum 10 characters)
- **Header does not include a Beads ID** — add `(pt-xxxxx)` to the subject
- **Header is not lowercase** — make the description lowercase to match this repo's convention

## Beads Issue ID Requirement

Every commit must reference at least one Beads issue ID in the header. This ties code changes to tracked work:

```bash
git commit -m "fix: restore auth flow (pt-abc12)"
git commit -m "refactor: split session handler (pt-j7x2q, pt-k3w9n)"  # Multiple IDs are allowed
```

The ID appears in parentheses at the **end** of the subject line, **within** the 65-character limit.

## Agent Attribution (Co-Authored-By Trailer)

If an AI agent materially contributed to the commit, include a `Co-Authored-By` footer:

```
feat(auth): add password reset email (pt-k9m3c)

Users had no way to recover lost passwords, increasing support
burden. Email-based recovery is the standard and reduces manual
intervention.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Recognized agent emails:
- `noreply@anthropic.com` — for Claude family agents
- `codex@openai.com` — for Codex/GPT agents

If no agent attribution should be recorded, omit the footer. Do not include fabricated or unsupported email addresses.

## Pre-Commit Validation

Before committing, run the preflight check:

```bash
npm run commit:preflight -- --message "Your title (pt-xxxx)" --trailer "Co-Authored-By: Agent Name <recognized-email>"
```

This validates:
- Header format and length
- Body presence and structure
- Beads ID format
- Agent email format (if provided)
- File structure, linting, and security checks

The preflight command will provide detailed feedback if any validation fails.

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- `AGENTS.md` → Commit Preflight section for pre-commit workflow
- `scripts/generate-ai-context.mjs` — generates AI context docs (referenced in body examples)
