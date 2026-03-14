#!/bin/bash
# TaskCompleted hook — runs when a task is being marked complete
# Exit code 2 = prevent completion and send feedback
# Exit code 0 = allow task completion

HOOL_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Check for uncommitted changes that the teammate may have made
UNCOMMITTED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -gt "0" ]; then
  echo "TASK_COMPLETE_CHECK: $UNCOMMITTED uncommitted file(s) detected. PL should review and commit before proceeding."
fi

exit 0
