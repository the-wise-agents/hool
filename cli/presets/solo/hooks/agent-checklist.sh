#!/bin/bash
# Hook: Post-agent operational checklist reminder
# Type: Stop and SubagentStop
# Outputs JSON with additionalContext so the agent actually sees and acts on it
# (plain text to stdout was often ignored — JSON injection ensures visibility)

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo '.')"
HOOL_DIR="$PROJECT_ROOT/.hool"

# Check if task-board was recently updated (within last 5 minutes)
STALE_WARNING=""
if [ -f "$HOOL_DIR/operations/task-board.md" ]; then
  TASK_BOARD_MOD=$(stat -f %m "$HOOL_DIR/operations/task-board.md" 2>/dev/null || stat -c %Y "$HOOL_DIR/operations/task-board.md" 2>/dev/null || echo "0")
  NOW=$(date +%s)
  AGE=$((NOW - TASK_BOARD_MOD))
  if [ "$AGE" -gt 300 ]; then
    STALE_WARNING=" WARNING: task-board.md not updated in ${AGE}s."
  fi
fi

CHECKLIST="OPERATIONAL CHECKLIST — Before finishing, verify: (1) Updated .hool/memory/<agent>/cold.md with work log entries (2) Rebuilt .hool/memory/<agent>/hot.md from cold log (3) Moved [GOTCHA]/[PATTERN] entries to best-practices.md (4) Logged issues to .hool/operations/issues.md (5) Logged inconsistencies to .hool/operations/inconsistencies.md (6) Marked task complete on .hool/operations/task-board.md (7) Verified no governor-feedback.md violations in output.${STALE_WARNING} If any items are incomplete, address them now."

printf '{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"%s"}}\n' "$CHECKLIST"

exit 0
