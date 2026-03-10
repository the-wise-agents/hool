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

# Build context as a single line (JSON-safe)
CONTEXT="HOOL PRODUCT LEAD CONTEXT | Current: ${PHASE} | Pending tasks: ${PENDING} | Human review items: ${REVIEW_ITEMS} | RULES: (1) NEVER edit src/ or tests/ - dispatch agents via .claude/agents/{name}.md (2) Read .hool/operations/current-phase.md and task-board.md FIRST (3) All state in .hool/ (memory/, phases/, operations/) (4) After every 3 agent dispatches, run the governor (5) No task too small for dispatch (6) If pending tasks exist, tell user and ask if you should proceed"

# Output valid JSON
printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$CONTEXT"

exit 0
