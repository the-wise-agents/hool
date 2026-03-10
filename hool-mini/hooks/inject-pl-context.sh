#!/bin/bash
# Hook: Inject Product Lead context on every user prompt
# Type: UserPromptSubmit — fires BEFORE Claude processes each user message
# Outputs JSON with additionalContext to remind the PL of its identity and state

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo '.')"

# Read current phase
PHASE="unknown"
if [ -f "$PROJECT_ROOT/.hool/operations/current-phase.md" ]; then
  PHASE=$(head -5 "$PROJECT_ROOT/.hool/operations/current-phase.md" | grep -i "phase\|standby\|onboard" | head -1 | sed 's/^[[:space:]]*//' | tr -d '\n')
fi

# Count pending tasks
PENDING=0
if [ -f "$PROJECT_ROOT/.hool/operations/task-board.md" ]; then
  PENDING=$(grep -c '^\- \[ \]' "$PROJECT_ROOT/.hool/operations/task-board.md" 2>/dev/null | tr -d '\n' || echo "0")
fi

# Check for items needing human review
REVIEW_ITEMS=0
if [ -f "$PROJECT_ROOT/.hool/operations/needs-human-review.md" ]; then
  REVIEW_ITEMS=$(grep -c '^##\|^- ' "$PROJECT_ROOT/.hool/operations/needs-human-review.md" 2>/dev/null | tr -d '\n' || echo "0")
fi

# Phase-specific guidance — different advice depending on where we are
PHASE_LOWER=$(echo "$PHASE" | tr '[:upper:]' '[:lower:]')
PHASE_GUIDANCE=""
case "$PHASE_LOWER" in
  *onboard*)
    PHASE_GUIDANCE="ONBOARDING: Complete ALL onboarding tasks immediately. Reverse-engineer docs from code. Do not wait for explicit instruction."
    ;;
  *phase*0*|*init*)
    PHASE_GUIDANCE="PHASE 0: Ask what we're building, determine project type and mode, capture preferences."
    ;;
  *phase*1*|*brainstorm*)
    PHASE_GUIDANCE="PHASE 1: Interactive brainstorm with user. Explore ideas, constraints, scope. Get explicit sign-off."
    ;;
  *phase*2*|*spec*)
    PHASE_GUIDANCE="PHASE 2: Define user stories and acceptance criteria. Get sign-off (interactive) or advance (full-hool)."
    ;;
  *phase*3*|*design*)
    PHASE_GUIDANCE="PHASE 3: Design screens, components, visual language. Get sign-off (interactive) or advance (full-hool)."
    ;;
  *phase*4*|*arch*)
    PHASE_GUIDANCE="PHASE 4: FINAL HUMAN GATE. Define tech stack, contracts, schema, flows. Get sign-off before autonomous."
    ;;
  *phase*5*|*fe*scaffold*|*fe*lld*)
    PHASE_GUIDANCE="PHASE 5: Autonomous. Dispatch FE Tech Lead for scaffold + LLD. Verify output."
    ;;
  *phase*6*|*be*scaffold*|*be*lld*)
    PHASE_GUIDANCE="PHASE 6: Autonomous. Dispatch BE Tech Lead for scaffold + LLD. Verify output."
    ;;
  *phase*7*|*test*plan*)
    PHASE_GUIDANCE="PHASE 7: Autonomous. Dispatch QA for test plan. Verify coverage of all spec criteria."
    ;;
  *phase*8*|*impl*)
    PHASE_GUIDANCE="PHASE 8: Autonomous. Dispatch FE/BE Devs per task. Check output, route issues."
    ;;
  *phase*9*|*review*)
    PHASE_GUIDANCE="PHASE 9: Autonomous. Dispatch Tech Leads for code review. Route inconsistencies."
    ;;
  *phase*10*|*test*)
    PHASE_GUIDANCE="PHASE 10: Autonomous. Dispatch QA for testing. Route bugs to Forensic."
    ;;
  *phase*11*|*forensic*)
    PHASE_GUIDANCE="PHASE 11: Autonomous. Dispatch Forensic for root cause. Route fixes to Devs."
    ;;
  *phase*12*|*retro*)
    PHASE_GUIDANCE="PHASE 12: Run retrospective. Read all agents' memory. Write findings to needs-human-review.md."
    ;;
  *standby*)
    PHASE_GUIDANCE="STANDBY: Wait for user request. Route to appropriate phase/agent based on request type."
    ;;
esac

# Check for unresolved inconsistencies
INCONSISTENCIES=0
if [ -f "$PROJECT_ROOT/.hool/operations/inconsistencies.md" ]; then
  INCONSISTENCIES=$(grep -c '^- ' "$PROJECT_ROOT/.hool/operations/inconsistencies.md" 2>/dev/null | tr -d '\n' || echo "0")
fi

# Check governor dispatch count
DISPATCH_COUNT=0
if [ -f "$PROJECT_ROOT/.hool/metrics/dispatch-count.txt" ]; then
  DISPATCH_COUNT=$(cat "$PROJECT_ROOT/.hool/metrics/dispatch-count.txt" 2>/dev/null | tr -d '\n' || echo "0")
fi
GOVERNOR_DUE=""
if [ "$DISPATCH_COUNT" -gt 0 ] && [ $(( DISPATCH_COUNT % 3 )) -ge 2 ]; then
  GOVERNOR_DUE=" Governor audit due after next dispatch."
fi

# Calculate progress percentage for current phase
COMPLETED=0
TOTAL=0
if [ -f "$PROJECT_ROOT/.hool/operations/task-board.md" ]; then
  COMPLETED=$(grep -c '^\- \[x\]' "$PROJECT_ROOT/.hool/operations/task-board.md" 2>/dev/null || echo "0")
  TOTAL=$(( PENDING + COMPLETED ))
fi
PROGRESS=""
if [ "$TOTAL" -gt 0 ]; then
  PCT=$(( COMPLETED * 100 / TOTAL ))
  PROGRESS=" Progress: ${COMPLETED}/${TOTAL} (${PCT}%)"
fi

# Check for open bugs
OPEN_BUGS=0
if [ -f "$PROJECT_ROOT/.hool/operations/bugs.md" ]; then
  OPEN_BUGS=$(grep -c 'Status: open' "$PROJECT_ROOT/.hool/operations/bugs.md" 2>/dev/null || echo "0")
fi
BUG_INFO=""
if [ "$OPEN_BUGS" -gt 0 ]; then
  BUG_INFO=" Open bugs: ${OPEN_BUGS}."
fi

# Check execution mode for nudge behavior
MODE="interactive"
if [ -f "$PROJECT_ROOT/.hool/phases/00-init/project-profile.md" ]; then
  MODE_LINE=$(grep -i 'mode' "$PROJECT_ROOT/.hool/phases/00-init/project-profile.md" 2>/dev/null | head -1)
  if echo "$MODE_LINE" | grep -qi 'full-hool'; then
    MODE="full-hool"
  fi
fi

# Build nudge hint based on state
NUDGE=""
if [ "$PENDING" -eq 0 ] && [ "$COMPLETED" -gt 0 ]; then
  NUDGE=" NUDGE: No pending tasks — check phase gate conditions and advance if met."
elif [ "$REVIEW_ITEMS" -gt 0 ] && [ "$MODE" = "interactive" ]; then
  NUDGE=" NUDGE: ${REVIEW_ITEMS} items need human review — present them to user."
elif [ "$OPEN_BUGS" -ge 5 ]; then
  NUDGE=" NUDGE: 5+ open bugs — consider running a mini-retro."
fi

# Build context as a single line (JSON-safe)
CONTEXT="HOOL PRODUCT LEAD CONTEXT | Current: ${PHASE} | Mode: ${MODE} | Pending tasks: ${PENDING}${PROGRESS} | Human review: ${REVIEW_ITEMS} | Inconsistencies: ${INCONSISTENCIES} | Dispatches: ${DISPATCH_COUNT}${GOVERNOR_DUE}${BUG_INFO}${NUDGE} | ${PHASE_GUIDANCE} | RULES: (1) NEVER edit src/ or tests/ - dispatch agents (2) Read .hool/operations/current-phase.md and task-board.md FIRST (3) All state in .hool/ (4) After every 3 dispatches, run governor (5) No task too small for dispatch (6) If pending tasks, tell user and ask to proceed (7) Classify request complexity before routing (trivial/small/medium/large) (8) Nudge: in interactive mode SUGGEST next action, in full-hool mode ACT on it"

# Output valid JSON
printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$CONTEXT"

exit 0
