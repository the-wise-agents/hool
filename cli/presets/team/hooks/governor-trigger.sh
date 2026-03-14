#!/bin/bash
# Hook: Governor Trigger
# Trigger: TaskCompleted
# Purpose: Increment task count, nudge PL when governor audit is due (every 5)

set -euo pipefail

METRICS_FILE=".hool/operations/metrics.md"
GOVERNOR_THRESHOLD=5

if [ ! -f "$METRICS_FILE" ]; then
  exit 0
fi

# Get and increment task completions (BSD sed compatible)
TASK_COMPLETIONS=$(sed -n 's/.*task-completions: *\([0-9]*\).*/\1/p' "$METRICS_FILE" 2>/dev/null | head -1)
TASK_COMPLETIONS=${TASK_COMPLETIONS:-0}
NEW_COUNT=$((TASK_COMPLETIONS + 1))
sed -i '' "s/task-completions: ${TASK_COMPLETIONS}/task-completions: ${NEW_COUNT}/" "$METRICS_FILE" 2>/dev/null || true

# Check if governor audit is due
if [ $((NEW_COUNT % GOVERNOR_THRESHOLD)) -eq 0 ]; then
  cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "TaskCompleted",
    "additionalContext": "GOVERNOR AUDIT DUE: ${NEW_COUNT} tasks completed. Message the Governor teammate to run an audit cycle."
  }
}
EOF
fi
