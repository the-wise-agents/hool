# HOOL Workflow Reference

Complete workflow for every phase and agent -- what it does, what it writes, and what it triggers.

---

## Phase 0: Project Init
**Type**: Skill (interactive)
**Human**: Yes

### Workflow
```
1. Ask user: "What are we building?" (web, game, mobile, animation, CLI, API)
2. Discuss project type with user, determine routing decisions
3. Ask user for project name and brief description
4. Write project profile with routing decisions
5. Create project directory structure
6. Check global MCPs (~/.claude/mcp_servers.json) -- install any missing
7. Write .hool/mcps.json (read-only manifest of which MCPs this project uses)
8. Advance to Phase 1
```

### Writes
| File | Content |
|------|---------|
| `phases/00-init/project-profile.md` | Project type, name, description, routing decisions, installed MCPs |
| `operations/current-phase.md` | Phase: 1 -- Brainstorm |
| `.hool/mcps.json` | Read-only manifest: which global MCPs this project uses |
| `memory/product-lead/cold.md` | `[INIT] project-name -> type: web-app -> global MCPs verified: context7, playwright` |

### Invokes Next
-> **Phase 1: Brainstorm** (skill)

---

## Phase 1: Brainstorm
**Type**: Skill (interactive)
**Human**: Yes -- collaborative riffing

### Workflow
```
1. Read phases/00-init/project-profile.md
2. Listen to user's vision
3. Research similar projects (context7, deepwiki, web search)
4. Riff -- suggest improvements, features, approaches
5. Help user prioritize features (MVP vs v2 vs future)
6. Document everything
7. Ask: "Are you happy with this direction?"
8. On sign-off -> advance
```

### Reads
| File | Why |
|------|-----|
| `phases/00-init/project-profile.md` | Understand project type |

### Writes
| File | Content |
|------|---------|
| `phases/01-brainstorm/brainstorm.md` | Vision, core ideas, prioritized features (MVP/v2/future), inspiration, open questions, TL;DR |
| `operations/current-phase.md` | Phase: 2 -- Spec |
| `memory/product-lead/cold.md` | `[PHASE] brainstorm complete -> sign-off` |

### Invokes Next
-> **Phase 2: Spec** (skill)

---

## Phase 2: Spec
**Type**: Skill (interactive)
**Human**: Yes -- sign-off required

### Workflow
```
1. Read phases/00-init/project-profile.md + phases/01-brainstorm/brainstorm.md
2. Flag any conflicts in prior docs
3. Extract user stories from brainstorm
4. For each story:
   a. Write acceptance criteria (Given/When/Then)
   b. Identify edge cases -> ask user if unclear
   c. Define error states and user-facing messages
   d. List all UI states (empty, loading, error, populated)
5. Define data model (conceptual entities + relationships)
6. Define non-functional requirements (perf, browsers, a11y)
7. Explicitly list what's OUT of scope
8. Resolve all open questions -- no TBDs allowed
9. Ask: "Do you approve this spec?"
10. On sign-off -> advance
```

### Reads
| File | Why |
|------|-----|
| `phases/00-init/project-profile.md` | Project type constraints |
| `phases/01-brainstorm/brainstorm.md` | Features to spec out |

### Writes
| File | Content |
|------|---------|
| `phases/02-spec/spec.md` | User stories (US-XXX) with acceptance criteria, edge cases, error states, UI states, data model, NFRs, out of scope, TL;DR |
| `operations/current-phase.md` | Phase: 3 -- Design |
| `memory/product-lead/cold.md` | `[PHASE] spec complete -> X user stories, Y acceptance criteria -> sign-off` |

### Invokes Next
-> **Phase 3: Design** (skill)

---

## Phase 3: Design
**Type**: Skill (interactive)
**Human**: Yes -- sign-off required (LAST design gate)

### Workflow
```
1. Read phases/00-init, 01-brainstorm, 02-spec -- flag conflicts
2. Inventory every screen/view from spec
3. Map user flows between screens
4. Identify reusable UI components
5. Propose design system (colors, typography, spacing)
6. Search for open-source UI kits/component libraries -> suggest to user
7. For each screen:
   a. Create HTML design card in phases/03-design/cards/
   b. Show all states (default, hover, empty, loading, error)
   c. Document interactions, animations, transitions
8. Define responsive breakpoints
9. Present all cards to user
10. Ask: "Do you approve these designs?"
11. On sign-off -> advance
```

### Reads
| File | Why |
|------|-----|
| `phases/00-init/project-profile.md` | Platform constraints (web vs mobile viewport) |
| `phases/01-brainstorm/brainstorm.md` | Vision and inspiration |
| `phases/02-spec/spec.md` | Every screen/feature that needs design |

### Writes
| File | Content |
|------|---------|
| `phases/03-design/design.md` | Design system, screen inventory (with states + interactions), user flows (mermaid), reusable components, responsive breakpoints, animations |
| `phases/03-design/cards/*.html` | One self-contained HTML file per screen showing all states |
| `operations/current-phase.md` | Phase: 4 -- Architecture |
| `memory/product-lead/cold.md` | `[PHASE] design complete -> X screens, Y components -> sign-off` |

### Invokes Next
-> **Phase 4: Architecture** (skill + subagents)

---

## Phase 4: Architecture
**Type**: Skill (interactive for decisions) + Subagents (for validation and doc generation)
**Human**: Yes -- sign-off required (FINAL human gate)

### Workflow
```
1. Read phases/00-init, 01-brainstorm, 02-spec, 03-design -- flag conflicts
2. INTERACTIVE: Present tech stack recommendations with rationale
   - Language, FE framework, BE framework, DB, auth, hosting, libraries
   - Discuss with user, get alignment
3. INTERACTIVE: Present key architectural decisions
   - Logging strategy, error handling, caching, deployment
   - Discuss with user, get alignment
4. Product Lead + human write API contracts and define DB schema
5. SPAWN FE Tech Lead (subagent):
   a. Read phases/00-init, 02-spec, 03-design, 04-architecture
   b. Validate contracts from FE perspective (consumable? missing fields? awkward shapes?)
   c. Generate FE domain docs: component-contract mapping, state management plan
   d. Flag any concerns to Product Lead
6. SPAWN BE Tech Lead (subagent):
   a. Read phases/00-init, 02-spec, 04-architecture (architecture, contracts, schema)
   b. Validate contracts from BE perspective (implementable? schema supports all queries?)
   c. Generate BE domain docs: service-contract mapping, middleware plan
   d. Flag any concerns to Product Lead
7. CROSS-VALIDATION: FE Tech Lead reviews BE domain docs, BE Tech Lead reviews FE domain docs
   - Flag any integration mismatches
8. Product Lead reviews all generated docs for consistency against spec and design
   - Resolve any flagged concerns
9. Assemble all docs
10. Include: how to run FE, how to run BE, how to bring up infra
11. Present complete architecture to user
12. Ask: "Do you approve this architecture?"
13. On sign-off -> advance (HUMAN IS NOW OUT OF THE LOOP)
```

### Reads
| File | Why |
|------|-----|
| `phases/00-init/project-profile.md` | Platform constraints |
| `phases/01-brainstorm/brainstorm.md` | Feature scope |
| `phases/02-spec/spec.md` | What needs to be built |
| `phases/03-design/design.md` | UI structure, component inventory |

### Writes
| File | Content |
|------|---------|
| `phases/04-architecture/architecture.md` | Tech stack table, system overview diagram (mermaid), directory structure, auth flow, error handling strategy, logging architecture, environment setup (how to run FE/BE/infra), TL;DR |
| `phases/04-architecture/contracts.md` | Every API endpoint: method, path, request body, response (success + error), status codes, auth requirements. Labeled CONTRACT-XXX |
| `phases/04-architecture/schema.md` | Every table: columns, types, constraints, indexes, relationships, migration strategy |
| `phases/04-architecture/flows.md` | Mermaid sequence diagrams for every major feature flow + error flows |
| `phases/04-architecture/fe/` | FE Tech Lead validation notes, component-contract mapping |
| `phases/04-architecture/be/` | BE Tech Lead validation notes, service-contract mapping |
| `operations/current-phase.md` | Phase: 5 -- Scaffold |
| `memory/product-lead/cold.md` | `[PHASE] architecture complete -> X endpoints, Y tables, Z flows -> sign-off` |
| `memory/fe-tech-lead/cold.md` | `[ARCH-VALIDATE] contracts validated from FE perspective -> N concerns flagged` |
| `memory/be-tech-lead/cold.md` | `[ARCH-VALIDATE] contracts validated from BE perspective -> N concerns flagged` |

### Invokes Next
-> **Phase 5: FE Scaffold** + **Phase 6: BE Scaffold** (IN PARALLEL)

---

## Phase 5: FE Scaffold
**Type**: Subagent (autonomous)
**Agent**: FE Tech Lead
**Human**: No

### Workflow
```
1. Read context manifest
2. Initialize FE project (framework from architecture doc)
3. Configure: build tools, linting, formatting, TypeScript
4. Set up routing: all routes from design screen inventory (placeholder pages)
5. Set up design system: CSS variables/theme from design doc
6. Set up component library (if chosen)
7. Set up logging: console -> logs/fe.log in local dev
8. Set up state management (if applicable)
9. Set up API client: base URL, auth headers, error handling from architecture
10. Create placeholder components for every reusable component from design
11. Verify: npm run dev works
12. Write FE LLD doc
13. Update work log
```

### Reads
| File | Why |
|------|-----|
| `phases/00-init/project-profile.md` | Platform specifics |
| `phases/03-design/design.md` | Screens, components, design system |
| `phases/04-architecture/architecture.md` | Tech stack, directory structure, logging strategy |

### Writes
| File | Content |
|------|---------|
| `phases/05-fe-scaffold/fe-lld.md` | How to run, directory structure, routes table, components table, state management plan, API client usage, logging setup, conventions |
| `memory/fe-tech-lead/cold.md` | `[SCAFFOLD-FE] initialized React+Vite, 8 routes, design system configured, API client ready` |
| `memory/product-lead/cold.md` | `[PHASE] FE scaffold complete` |
| Source files in `src/frontend/` | Actual FE project with all config, routes, placeholders |

### Invokes Next (via Product Lead)
-> Waits for Phase 6 to also complete -> then **Phase 7: Test Plan**

---

## Phase 6: BE Scaffold
**Type**: Subagent (autonomous)
**Agent**: BE Tech Lead
**Human**: No

### Workflow
```
1. Read context manifest
2. Initialize BE project (framework from architecture doc)
3. Configure: linting, formatting, TypeScript
4. Set up server: framework, middleware stack (in order from architecture)
5. Set up Docker: docker-compose.yml for DB, cache, etc.
6. Set up database: connection, ORM/query builder config
7. Run migrations: create all tables from schema doc
8. Set up auth middleware: token verification, route protection
9. Set up logging: structured JSON -> logs/be.log, request logging
10. Create route stubs: every endpoint from contracts, returning 501
11. Set up request validation: middleware using contracts as source
12. Verify: server starts, connects to DB, stubs respond
13. Write BE LLD doc
14. Update work log
```

### Reads
| File | Why |
|------|-----|
| `phases/00-init/project-profile.md` | Platform specifics |
| `phases/04-architecture/architecture.md` | Tech stack, middleware order, logging strategy |
| `phases/04-architecture/contracts.md` | Every endpoint to stub |
| `phases/04-architecture/schema.md` | Tables to migrate |

### Writes
| File | Content |
|------|---------|
| `phases/06-be-scaffold/be-lld.md` | How to run (including docker-compose), directory structure, endpoint stub status table, DB config, middleware stack order, services table, logging setup, error handling format, conventions |
| `memory/be-tech-lead/cold.md` | `[SCAFFOLD-BE] initialized Express+Prisma, docker: postgres+redis, 12 tables, 15 route stubs` |
| `memory/product-lead/cold.md` | `[PHASE] BE scaffold complete` |
| Source files in `src/backend/` | Actual BE project with all config, stubs, docker-compose, migrations |

### Invokes Next (via Product Lead)
-> Waits for Phase 5 to also complete -> then **Phase 7: Test Plan**

---

## Phase 7: Test Plan
**Type**: Subagent (autonomous)
**Agent**: QA
**Human**: No

### Workflow
```
1. Read context manifest
2. For each user story (US-XXX) in spec:
   a. Generate unit test cases for underlying logic
   b. Generate integration test cases for related endpoints
   c. Generate E2E test cases for the full user flow
   d. Generate visual test cases for related screens
3. Cross-reference: every acceptance criterion has at least one test
4. Create coverage matrix (spec item -> test cases)
5. Create test file stubs in tests/ directory
6. Update work log
```

### Reads
| File | Why |
|------|-----|
| `phases/00-init/project-profile.md` | Test framework selection per domain |
| `phases/02-spec/spec.md` | Every user story and acceptance criterion |
| `phases/04-architecture/contracts.md` | Endpoint shapes for integration tests |
| `phases/04-architecture/schema.md` | Data integrity test targets |
| `phases/05-fe-scaffold/fe-lld.md` | Component test targets |
| `phases/06-be-scaffold/be-lld.md` | Service test targets |

### Writes
| File | Content |
|------|---------|
| `phases/07-test-plan/test-plan.md` | Coverage matrix, all test cases (TC-XXX) grouped by type (unit, integration, E2E, visual), test infrastructure details |
| `memory/qa/cold.md` | `[QA-PLAN] generated X unit, Y integration, Z e2e, W visual test cases -- all N user stories covered` |
| `memory/product-lead/cold.md` | `[PHASE] test plan complete -> X test cases` |
| `tests/**/*.test.*` | Test file stubs with describe/it blocks, assertions as TODO |

### Invokes Next (via Product Lead)
-> Product Lead breaks implementation work into tasks on task-board.md
-> **Phase 8a: FE Dev** + **Phase 8b: BE Dev** (IN PARALLEL)

---

## Phase 8a: FE Dev
**Type**: Subagent (autonomous, invoked per task)
**Human**: No

### Workflow (per task)
```
1. Read task from operations/task-board.md
2. Read design card for the screen being built
3. Read relevant test cases from phases/07-test-plan/test-plan.md
4. Read API contracts for endpoints being called
5. Check existing components -- anything reusable?
6. Write/update tests FIRST
7. Implement component/page until tests pass
8. Compare output against design card visually
9. Add logging: user actions, API calls, errors -> logs/fe.log
10. Run linter + type checker
11. Run full FE test suite
12. Update work log
13. Mark task complete on task-board
```

### Reads
| File | Why |
|------|-----|
| `phases/02-spec/spec.md` | Relevant user story |
| `phases/03-design/design.md` | Relevant screen description |
| `phases/04-architecture/contracts.md` | API shapes being called |
| `phases/05-fe-scaffold/fe-lld.md` | Blueprint -- where to put files, conventions |
| `phases/07-test-plan/test-plan.md` | Test cases for this feature |
| `phases/03-design/cards/*.html` | Visual reference |
| `operations/task-board.md` | Current task details |
| `operations/issues.md` | Known issues in files being touched |
| `memory/fe-dev/hot.md` | Own history, gotchas |

### Writes
| File | Content |
|------|---------|
| Source files in `src/frontend/` | Components, pages, hooks, utils |
| Test files in `tests/unit/`, `tests/e2e/` | Unit tests for new code |
| `memory/fe-dev/cold.md` | `[FE-IMPL] TASK-XXX: LoginForm component -> src/frontend/components/LoginForm.tsx` |
| `memory/fe-dev/hot.md` | Rebuilt from cold log after task |
| `operations/task-board.md` | Mark task [x] complete |
| `operations/issues.md` | If bugs found in existing code (doesn't fix, just logs) |
| `operations/inconsistencies.md` | If design/spec doesn't match what's feasible |

### Invokes Next (via Product Lead)
-> After task complete -> Product Lead picks next FE task OR
-> If all FE+BE tasks done -> **Phase 9: Tech Lead Review**

---

## Phase 8b: BE Dev
**Type**: Subagent (autonomous, invoked per task)
**Human**: No

### Workflow (per task)
```
1. Read task from operations/task-board.md
2. Read contract for endpoints being implemented
3. Read relevant test cases from phases/07-test-plan/test-plan.md
4. Read schema for tables being queried
5. Check existing services -- anything reusable?
6. Write/update tests FIRST (unit + integration)
7. Implement service logic
8. Implement controller (thin -- delegates to service)
9. Add request validation (match contract input spec)
10. Add logging: requests, DB queries, errors -> logs/be.log
11. Run integration test -- does endpoint match contract?
12. Run linter + type checker
13. Run full BE test suite
14. Update work log
15. Mark task complete on task-board
```

### Reads
| File | Why |
|------|-----|
| `phases/02-spec/spec.md` | Relevant user story |
| `phases/04-architecture/contracts.md` | Endpoint contract (the source of truth) |
| `phases/04-architecture/schema.md` | Tables and relationships |
| `phases/06-be-scaffold/be-lld.md` | Blueprint -- where to put files, conventions |
| `phases/07-test-plan/test-plan.md` | Test cases for this feature |
| `operations/task-board.md` | Current task details |
| `operations/issues.md` | Known issues in files being touched |
| `memory/be-dev/hot.md` | Own history, gotchas |

### Writes
| File | Content |
|------|---------|
| Source files in `src/backend/` | Controllers, services, validators, middleware |
| Test files in `tests/unit/`, `tests/integration/` | Unit + integration tests |
| `memory/be-dev/cold.md` | `[BE-IMPL] TASK-XXX: POST /auth/login -> src/backend/routes/auth.ts, src/backend/services/auth.ts` |
| `memory/be-dev/hot.md` | Rebuilt from cold log after task |
| `operations/task-board.md` | Mark task [x] complete |
| `operations/issues.md` | If bugs found in existing code |
| `operations/inconsistencies.md` | If contract/schema doesn't match reality |

### Invokes Next (via Product Lead)
-> After task complete -> Product Lead picks next BE task OR
-> If all FE+BE tasks done -> **Phase 9: Tech Lead Review**

---

## Phase 9: Tech Lead Review
**Type**: Subagent (autonomous, invoked after implementation tasks)
**Agents**: FE Tech Lead (reviews FE code) + BE Tech Lead (reviews BE code)
**Human**: No

### Workflow

#### FE Tech Lead Review
```
1. Read ALL phase docs (full project context)
2. Read all FE source files in src/frontend/
3. Run review checklist:
   a. Spec compliance -- acceptance criteria implemented? Edge cases handled?
   b. Design compliance -- UI matches design cards? All states present?
   c. Contract compliance -- API calls match phases/04-architecture/contracts.md?
   d. Architecture compliance -- directory structure, state management, auth flow?
   e. LLD compliance -- conventions from phases/05-fe-scaffold/fe-lld.md followed?
   f. Code quality -- single responsibility, no duplication, logging present, no security vulns?
   g. Test coverage -- tests exist, match test plan, actually test behavior?
4. If consistent -> log pass
5. If inconsistency -> write to inconsistencies.md with type and severity
6. Update work log
```

#### BE Tech Lead Review
```
1. Read ALL phase docs (full project context)
2. Read all BE source files in src/backend/
3. Run review checklist:
   a. Contract compliance -- API responses match phases/04-architecture/contracts.md?
   b. Schema compliance -- queries match phases/04-architecture/schema.md? Indexes used?
   c. Spec compliance -- acceptance criteria implemented? Edge cases handled?
   d. Architecture compliance -- middleware order, auth flow, error handling?
   e. LLD compliance -- conventions from phases/06-be-scaffold/be-lld.md followed?
   f. Code quality -- single responsibility, no duplication, logging present, no security vulns?
   g. Test coverage -- tests exist, match test plan, actually test behavior?
4. If consistent -> log pass
5. If inconsistency -> write to inconsistencies.md with type and severity
6. Update work log
```

### Reads
| File | Why |
|------|-----|
| `phases/*` (ALL) | Full context -- comparing everything against everything |
| `phases/03-design/cards/*.html` | Visual reference for UI review (FE Tech Lead) |
| Source files in `src/frontend/`, `src/backend/` | The code itself |
| `operations/inconsistencies.md` | Don't re-report known issues |
| `memory/fe-tech-lead/hot.md` | Own history, recurring patterns (FE Tech Lead) |
| `memory/be-tech-lead/hot.md` | Own history, recurring patterns (BE Tech Lead) |

### Writes
| File | Content |
|------|---------|
| `operations/inconsistencies.md` | `INC-XXX: [type] -- [what doesn't match what] -- severity -- suggested action` |
| `memory/fe-tech-lead/cold.md` | `[REVIEW-FE] TASK-XXX: passed` or `[REVIEW-FE] TASK-XXX: 3 inconsistencies` |
| `memory/be-tech-lead/cold.md` | `[REVIEW-BE] TASK-XXX: passed` or `[REVIEW-BE] TASK-XXX: 3 inconsistencies` |
| `memory/product-lead/cold.md` | `[REVIEW] tech leads flagged X inconsistencies in TASK-XXX` |

### Invokes Next (via Product Lead)
-> If inconsistencies found with `suggested action: fix-code`:
  -> Route to **FE Dev** or **BE Dev** (based on file type)
-> If inconsistencies found with `suggested action: escalate-to-human`:
  -> Write to `operations/needs-human-review.md`
-> If all clean -> **Phase 10: QA Testing**

---

## Phase 10: QA Testing
**Type**: Subagent (autonomous)
**Agent**: QA
**Human**: No

### Workflow
```
1. Read spec (expected behavior) + test plan (test cases)
2. Run existing test suites:
   a. Unit tests -> report pass/fail counts
   b. Integration tests -> report pass/fail counts
   c. E2E tests -> report pass/fail counts
3. Execute test plan cases (TC-XXX) one by one:
   a. Set up preconditions
   b. Execute steps
   c. Verify expected results
   d. Capture evidence (screenshots, response bodies)
4. Visual testing:
   a. Playwright screenshot each screen
   b. Compare against design cards (multimodal)
   c. Check all states: default, empty, loading, error
5. Exploratory testing:
   a. Rapid clicks, double submissions
   b. Empty/max-length/special char inputs
   c. Browser back/forward during flows
   d. Permission boundary testing
6. For each failure -> write bug report
7. Update work log
```

### Reads
| File | Why |
|------|-----|
| `phases/02-spec/spec.md` | Expected behavior (source of truth) |
| `phases/07-test-plan/test-plan.md` | Test cases to execute |
| `phases/03-design/cards/*.html` | Visual comparison targets |
| `operations/bugs.md` | Don't re-report known bugs |
| `memory/qa/hot.md` | Own history |

### Writes
| File | Content |
|------|---------|
| `operations/bugs.md` | `BUG-XXX: [severity] [type] -- steps to reproduce, expected vs actual, evidence, status: open` |
| `memory/qa/cold.md` | `[QA-RUN] unit: 45/45 pass | integration: 12/15 pass | e2e: 8/10 pass` |
| `memory/qa/cold.md` | `[QA-BUG] BUG-XXX: high -- login returns 500 on special chars in email` |
| `memory/product-lead/cold.md` | `[BUG] QA found X bugs (Y critical, Z high)` |
| `operations/needs-human-review.md` | Subjective visual issues that can't be objectively judged |

### Invokes Next (via Product Lead)
-> If bugs found -> **Phase 11: Forensic** (for each bug)
-> If no bugs -> DONE (or next iteration cycle)

---

## Phase 11: Forensic
**Type**: Subagent (autonomous, invoked per bug)
**Human**: No

### Workflow (per bug)
```
1. Read the bug report from operations/bugs.md
2. Check operations/issues.md -- is this a known issue?
3. Check own work log -- seen this pattern before?
4. REPRODUCE the bug:
   - API bugs: make the API call, check response
   - UI bugs: Playwright navigate + interact
   - Data bugs: query DB directly
5. LOCATE root cause:
   - Read logs (logs/fe.log or logs/be.log)
   - Trace flow from user action to bug
   - Identify EXACT file:line where behavior diverges
6. VALIDATE:
   - Does fixing this line resolve the bug?
   - Does the fix break anything else?
   - Is there a deeper underlying issue?
7. DOCUMENT the fix (don't apply it -- that's the dev's job)
8. Update bug status
9. If pattern detected (3+ similar bugs) -> log pattern
10. Update work log
```

### Reads
| File | Why |
|------|-----|
| `operations/bugs.md` | The specific bug being investigated |
| `operations/issues.md` | Known issues, maybe already documented |
| `memory/forensic/hot.md` | Own history, pattern recognition |
| `logs/fe.log` | FE runtime logs |
| `logs/be.log` | BE runtime logs |
| Source files in `src/frontend/`, `src/backend/` | The code where the bug lives |

### Writes
| File | Content |
|------|---------|
| `operations/bugs.md` | Update bug: status -> diagnosed, root cause, file:line, fix description, regression risk |
| `operations/issues.md` | New issue if pattern detected: `ISS-XXX: [pattern] -- affected files, fix strategy, related bugs` |
| `memory/forensic/cold.md` | `[FORENSIC] BUG-XXX: null ref in auth middleware -> missing token check at src/backend/middleware/auth.ts:34` |
| `memory/product-lead/cold.md` | `[RESOLVED] BUG-XXX -> root cause identified, fix documented` |

### Invokes Next (via Product Lead)
-> Route diagnosed bug to **FE Dev** or **BE Dev** (based on fix location)
-> Dev reads bug entry, applies fix, marks bug resolved
-> **QA** re-runs to verify fix
-> If fix introduces new bugs -> cycle back to Forensic

---

## Product Lead (continuous)
**Type**: Master conductor (runs throughout)
**Human**: Minimal -- escalations only

### Workflow
```
ALWAYS RUNNING:
1. Track current phase in operations/current-phase.md
2. Manage operations/task-board.md -- create tasks, assign agents, track completion
3. Gate phase transitions -- don't advance until phase is done
4. Route feedback loops:
   - Tech Lead inconsistency -> right dev
   - QA bug -> Forensic -> right dev -> re-test
   - Human-reported bug -> Forensic
5. Monitor for escalations:
   - Spec gaps -> operations/needs-human-review.md
   - Subjective decisions -> operations/needs-human-review.md
   - Agent stuck -> operations/needs-human-review.md
6. Log everything to product-lead work logs
```

### Reads
| File | Why |
|------|-----|
| `operations/current-phase.md` | Where are we? |
| `operations/task-board.md` | What's in progress, what's blocked? |
| `operations/bugs.md` | Any open bugs to route? |
| `operations/inconsistencies.md` | Any issues to route? |
| `operations/needs-human-review.md` | Anything pending human input? |
| `memory/product-lead/hot.md` | Own history |

### Writes
| File | Content |
|------|---------|
| `operations/current-phase.md` | Phase transitions |
| `operations/task-board.md` | Task creation, assignment, status updates |
| `memory/product-lead/cold.md` | Every event: phase changes, dispatches, bugs, resolutions, escalations |
| `memory/product-lead/hot.md` | Rebuilt from cold log after each action |
| `operations/needs-human-review.md` | Escalations that need human input |

### Invokes
-> Every other agent, based on phase and feedback routing

---

## Feedback Loop Diagram

```
                    +--------------------------------------------------+
                    |              PRODUCT LEAD                         |
                    |    (routes, gates, logs, escalates)               |
                    +--+----+----+----+----+----+----+-----------------+
                       |    |    |    |    |    |    |
   Phase 0-4 ---------+    |    |    |    |    |    |
   (skills, human in loop) |    |    |    |    |    |
                            |    |    |    |    |    |
              +-------------+    |    |    |    |    |
              v                  v    |    |    |    |
        +--------------+ +--------------+ |    |    |
        |FE Tech Lead  | |BE Tech Lead  | |    |    |
        |(scaffold)    | |(scaffold)    | |    |    |
        +----+---------+ +----+--------+  |    |    |
             |                |           |    |    |
             +-------+-------+           |    |    |
                     v                    |    |    |
              +----------+               |    |    |
              |    QA    |               |    |    |
              |(test plan)|               |    |    |
              +----+-----+               |    |    |
                   |                     |    |    |
          +--------+--------+           |    |    |
          v                 v           |    |    |
   +--------------+ +--------------+    |    |    |
   |   FE Dev     | |   BE Dev     |    |    |    |
   +------+-------+ +------+-------+    |    |    |
          |                |            |    |    |
          +-------+-------+            |    |    |
                  v                     |    |    |
        +--------------------+         |    |    |
        |FE/BE Tech Leads    |<--------+    |    |
        |(code review)       |              |    |
        +------+-------------+              |    |
               |                            |    |
      +--------+--- inconsistency ----------+    |
      |        v                                 |
      | +------------------+                     |
      | |       QA         |<--------------------+
      | |   (testing)      |
      | +------+-----------+
      |        |
      |        | bug found
      |        v
      | +----------+
      | | Forensic  |
      | +------+---+
      |        |
      |        | fix documented
      |        v
      |  Route to FE/BE Dev
      |        |
      |        | fix applied
      |        v
      |  Re-run QA -----------------------------------+
      |                                               |
      +-- fix-code -> Route to FE/BE Dev -> re-review
```

---

## Summary: Who writes what

| File | Written by |
|------|-----------|
| `phases/00-init/project-profile.md` | Phase 0 (Init) |
| `phases/01-brainstorm/brainstorm.md` | Phase 1 (Brainstorm) |
| `phases/02-spec/spec.md` | Phase 2 (Spec) |
| `phases/03-design/design.md` | Phase 3 (Design) |
| `phases/03-design/cards/*.html` | Phase 3 (Design) |
| `phases/04-architecture/architecture.md` | Phase 4 (Architecture -- Product Lead + Tech Leads) |
| `phases/04-architecture/contracts.md` | Phase 4 (Architecture -- Product Lead, validated by Tech Leads) |
| `phases/04-architecture/schema.md` | Phase 4 (Architecture -- Product Lead, validated by BE Tech Lead) |
| `phases/04-architecture/flows.md` | Phase 4 (Architecture -- Product Lead) |
| `phases/04-architecture/fe/` | Phase 4 (FE Tech Lead validation notes) |
| `phases/04-architecture/be/` | Phase 4 (BE Tech Lead validation notes) |
| `phases/05-fe-scaffold/fe-lld.md` | Phase 5 (FE Tech Lead) |
| `phases/06-be-scaffold/be-lld.md` | Phase 6 (BE Tech Lead) |
| `phases/07-test-plan/test-plan.md` | Phase 7 (QA) |
| `operations/current-phase.md` | Product Lead |
| `operations/task-board.md` | Product Lead + all agents (mark complete) |
| `operations/bugs.md` | QA (create) + Forensic (update) |
| `operations/issues.md` | Forensic + Devs (when they find issues) |
| `operations/inconsistencies.md` | FE/BE Tech Leads + Devs |
| `operations/needs-human-review.md` | Any agent via Product Lead |
| `memory/product-lead/hot.md` | Product Lead (rebuilt after each action) |
| `memory/product-lead/cold.md` | Product Lead (every event, append-only) |
| `memory/product-lead/best-practices.md` | Product Lead (patterns, gotchas, arch decisions) |
| `memory/product-lead/issues.md` | Product Lead (personal issues log) |
| `memory/fe-tech-lead/hot.md` | FE Tech Lead (rebuilt after each task) |
| `memory/fe-tech-lead/cold.md` | FE Tech Lead (append-only) |
| `memory/fe-tech-lead/best-practices.md` | FE Tech Lead (patterns, gotchas) |
| `memory/fe-tech-lead/issues.md` | FE Tech Lead (personal issues log) |
| `memory/be-tech-lead/hot.md` | BE Tech Lead (rebuilt after each task) |
| `memory/be-tech-lead/cold.md` | BE Tech Lead (append-only) |
| `memory/be-tech-lead/best-practices.md` | BE Tech Lead (patterns, gotchas) |
| `memory/be-tech-lead/issues.md` | BE Tech Lead (personal issues log) |
| `memory/fe-dev/hot.md` | FE Dev (rebuilt after each task) |
| `memory/fe-dev/cold.md` | FE Dev (append-only) |
| `memory/fe-dev/best-practices.md` | FE Dev (patterns, gotchas) |
| `memory/fe-dev/issues.md` | FE Dev (personal issues log) |
| `memory/be-dev/hot.md` | BE Dev (rebuilt after each task) |
| `memory/be-dev/cold.md` | BE Dev (append-only) |
| `memory/be-dev/best-practices.md` | BE Dev (patterns, gotchas) |
| `memory/be-dev/issues.md` | BE Dev (personal issues log) |
| `memory/qa/hot.md` | QA (rebuilt after each task) |
| `memory/qa/cold.md` | QA (append-only) |
| `memory/qa/best-practices.md` | QA (patterns, gotchas) |
| `memory/qa/issues.md` | QA (personal issues log) |
| `memory/forensic/hot.md` | Forensic (rebuilt after each task) |
| `memory/forensic/cold.md` | Forensic (append-only) |
| `memory/forensic/best-practices.md` | Forensic (patterns, gotchas) |
| `memory/forensic/issues.md` | Forensic (personal issues log) |
| `logs/fe.log` | FE application (runtime) |
| `logs/be.log` | BE application (runtime) |
| Source code in `src/frontend/`, `src/backend/` | FE Tech Lead, BE Tech Lead, FE Dev, BE Dev |
| Test files in `tests/unit/`, `tests/integration/`, `tests/e2e/` | QA (stubs), FE Dev, BE Dev |
