#!/bin/bash
# Hook: Identity Reminder
# Trigger: UserPromptSubmit
# Purpose: Inject current phase and task status into prompt context

set -euo pipefail

CURRENT_PHASE=$(head -5 .hool/operations/current-phase.md 2>/dev/null | sed -n 's/.*phase: *\([^ ]*\).*/\1/p' | head -1)
CURRENT_PHASE=${CURRENT_PHASE:-unknown}

# Get task board status
PENDING=0
COMPLETED=0
if [ -f ".hool/operations/task-board.md" ]; then
  PENDING=$(grep -c '^\- \[ \]' ".hool/operations/task-board.md" 2>/dev/null || echo "0")
  COMPLETED=$(grep -c '^\- \[x\]' ".hool/operations/task-board.md" 2>/dev/null || echo "0")
fi

CONTEXT="HOOL CONTEXT | "
CONTEXT+="Phase: ${CURRENT_PHASE} | "
CONTEXT+="Tasks: ${PENDING} pending, ${COMPLETED} done | "
CONTEXT+="REMEMBER: Read your agent file for identity and process. Check memory files. Update memory before going idle."

cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "${CONTEXT}"
  }
}
EOF
