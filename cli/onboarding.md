# `hool onboard` -- Existing Project Onboarding

## What It Does

Takes an existing codebase and reverse-engineers HOOL's phase doc structure from it, so agents can operate on the project as if it was built with HOOL from day one.

## The Problem

An existing project has:
- Code, but no spec doc
- A database, but no schema doc
- API endpoints, but no contracts doc
- Design decisions, but no architecture doc
- Bugs, but no issues tracker
- History, but no work logs

Agents need these docs to function. Onboarding creates them.

## Flow

```bash
npx hool onboard
```

### Step 1: Project Discovery (automated)

Agent scans the project and identifies:
```
- Language(s) and framework(s) used
- Directory structure pattern
- Package manager and dependencies
- Database type (from config/ORM files/docker-compose)
- API endpoints (from route files)
- Frontend routes (from router config)
- Existing tests (type, framework, coverage)
- Existing CI/CD (GitHub Actions, etc.)
- Existing docs (README, API docs, etc.)
- Environment setup (Docker, .env files)
- Logging approach (if any)
```

Output: `phases/00-init/project-profile.md` -- auto-generated project profile.

### Step 2: Architecture Extraction (automated)

Agent reads the codebase and generates:
```
phases/04-architecture/architecture.md    <- tech stack, directory structure, patterns observed
phases/04-architecture/contracts.md       <- extracted from route handlers + response types
phases/04-architecture/schema.md          <- extracted from migrations/ORM models/SQL files
phases/04-architecture/flows.md           <- inferred from code flow (best effort)
phases/05-fe-scaffold/fe-lld.md           <- FE structure, components, routes, state management
phases/06-be-scaffold/be-lld.md           <- BE structure, services, middleware, endpoints
```

These are REVERSE-ENGINEERED, not designed. They describe what IS, not what SHOULD BE.

### Step 3: Spec Inference (automated + human review)

Agent reads the codebase + any existing docs (README, wiki, comments) and generates:
```
phases/02-spec/spec.md            <- best-effort spec from observed behavior
```

This goes to `operations/needs-human-review.md` because inferred specs are unreliable.
The human reviews and corrects before agents start working.

### Step 4: Gap Analysis (automated)

Agent identifies what's missing or inconsistent:
```
operations/inconsistencies.md  <- things that look wrong or contradictory
operations/issues.md           <- tech debt, missing error handling, no tests, etc.
```

Example output:
```markdown
## ISS-001: No error handling on /api/users endpoint
- Found by: onboarding
- File: src/backend/routes/users.ts:45
- Description: Raw DB query with no try/catch, no error response format

## ISS-002: Frontend has no loading states
- Found by: onboarding
- Description: API calls in 12 components have no loading/error handling

## ISS-003: No tests exist for payment module
- Found by: onboarding
- Description: src/backend/services/payment.ts has 0% test coverage, handles money
```

### Step 5: Setup HOOL Infrastructure (automated)

Creates the HOOL file structure around the existing project:
```
phases/                <- generated phase docs from steps 1-3
operations/                <- gap analysis + empty templates
memory/
  <agent-name>/
    hot.md             <- hot log, initialized empty
    cold.md            <- cold log, initialized empty
    best-practices.md  <- seeded from onboarding findings (see below)
    issues.md          <- seeded from onboarding findings (see below)
logs/
  fe.log
  be.log
.hool/
  prompts/             <- agent prompts copied from hool-mini templates
  mcps.json            <- MCP config based on detected stack
```

Injects HOOL product-lead instructions into CLAUDE.md.
Installs required MCPs based on detected project type.

#### Seeding Agent Memory

Onboarding discovers project-specific knowledge during extraction and gap analysis. Instead of discarding it, route findings to the right agent's memory files so agents start with context, not cold:

| Finding | Routes to |
|---------|-----------|
| Inconsistent response formats across endpoints | `memory/be-tech-lead/best-practices.md` |
| Duplicated components or dead imports | `memory/fe-tech-lead/best-practices.md` |
| Missing indexes, schema issues | `memory/be-dev/best-practices.md` |
| No tests on critical paths (payments, auth) | `memory/qa/issues.md` |
| No error handling on endpoints | `memory/be-dev/issues.md` |
| No loading/error states in UI | `memory/fe-dev/issues.md` |
| Inconsistent naming patterns | `memory/fe-tech-lead/issues.md` + `memory/be-tech-lead/issues.md` |
| Logging approach (or lack of) | `memory/fe-dev/best-practices.md` + `memory/be-dev/best-practices.md` |

Format: same crisp one-liners agents would write themselves.
```
- [ONBOARD-GOTCHA] API responses use 3 different formats: { data }, { result }, raw arrays
- [ONBOARD-ISSUE] src/services/payment.ts has 0% test coverage, handles money
```

Agents see these on first invocation and know what they're walking into.

### Step 6: Human Review Gate

Presents a summary:
```
Onboarding complete for: [project-name]

Detected:
  Type: Web application (React + Express + PostgreSQL)
  FE: 42 components, 8 routes, Zustand for state
  BE: 15 endpoints, 6 services, Prisma ORM
  DB: PostgreSQL, 12 tables
  Tests: Jest (23 unit tests, 0 integration, 0 E2E)
  Logging: console.log only (no structured logging)

Generated:
  Architecture doc: phases/04-architecture/architecture.md
  Contracts: 15 endpoints documented in phases/04-architecture/contracts.md
  Schema: 12 tables documented in phases/04-architecture/schema.md
  FE LLD: phases/05-fe-scaffold/fe-lld.md
  BE LLD: phases/06-be-scaffold/be-lld.md
  Spec (inferred): phases/02-spec/spec.md !! NEEDS HUMAN REVIEW

Agent memory seeded:
  be-tech-lead/best-practices.md: 3 entries (response format inconsistency, ...)
  qa/issues.md: 5 entries (missing test coverage on critical paths, ...)
  fe-dev/issues.md: 2 entries (no loading states, ...)
  be-dev/issues.md: 4 entries (no error handling, missing indexes, ...)

Issues found: 14
  Critical: 2 (no auth on admin routes, SQL injection risk)
  High: 4 (missing error handling, no input validation)
  Medium: 5 (no tests for critical paths)
  Low: 3 (inconsistent naming, unused imports)

Next steps:
  1. Review phases/02-spec/spec.md -- correct any wrong assumptions
  2. Review operations/issues.md -- prioritize what to fix
  3. Tell the Product Lead what you want to do -- it will route to the right phase/agent
```

#### After Onboarding

The Product Lead is on standby with full project knowledge. The user tells it what they want ("add dark mode", "fix the login bug", "we need test coverage") and the Product Lead routes to the right phase and agent. No phase selection menu — the Product Lead figures it out from the request.

`operations/current-phase.md` is set to:
```markdown
## Current Phase: standby
Onboarded project — phases 0-7 reverse-engineered from existing code.
Human reviewed spec and architecture on [date].
Awaiting user request.
```

## What Each Extraction Agent Does

### Contract Extractor
Reads every route file and generates contracts:
- HTTP method + path
- Request body type (from validation schema or TS types)
- Response body type (from return statements or TS types)
- Status codes (from explicit responses)
- Auth requirements (from middleware)

### Schema Extractor
Reads ORM models / migration files / SQL:
- Table names, columns, types, constraints
- Indexes
- Relationships (foreign keys, join tables)
- Seeds / default data

### Component Extractor (FE)
Reads component files:
- Component name, location, props interface
- Which routes they're used on
- State management (local vs global)
- API calls made

### Service Extractor (BE)
Reads service/controller files:
- Service name, methods, dependencies
- Which endpoints call which services
- External integrations (email, payment, etc.)

## Onboarding vs Init Comparison

| Aspect | `hool init` | `hool onboard` |
|--------|------------|----------------|
| Project state | Empty | Existing code |
| Docs source | Human writes them | Agent extracts from code |
| Spec accuracy | 100% (human authored) | ~70% (inferred, needs review) |
| Contracts | Designed | Reverse-engineered |
| Schema | Designed | Extracted from ORM/migrations |
| Issues | None yet | Existing tech debt surfaced |
| Human effort | Full phases 0-4 | Review + correct generated docs |
| Time to agents | After 4 phases | After human reviews extracted docs |

## Important Caveats

1. **Inferred specs are NOT authoritative.** The agent guesses what the product should do from what the code does. Bugs become "features" in the inferred spec. Human MUST review.
2. **Contracts may be incomplete.** If endpoints have dynamic responses or undocumented behavior, the extraction misses them.
3. **Schema extraction depends on ORM.** Raw SQL projects are harder to extract from.
4. **No brainstorm/design docs.** These don't exist for existing projects. The agents work without them, using the code itself as the source of truth for design.
