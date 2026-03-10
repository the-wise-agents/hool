#!/bin/bash
# Hook: Load HOOL state on new session start
# Type: PreToolUse (first invocation) or UserPromptSubmit
# Why: When a new session begins, the agent needs to know where it left off.
#       This hook injects the most recent pre-compact snapshot + current state.

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo '.')"
HOOL_DIR="$PROJECT_ROOT/.hool"
SNAPSHOTS_DIR="$HOOL_DIR/metrics/snapshots"
SESSION_MARKER="$HOOL_DIR/metrics/session-active.txt"

# Only run once per session — check if we already injected
if [ -f "$SESSION_MARKER" ]; then
  MARKER_AGE=$(( $(date +%s) - $(stat -f %m "$SESSION_MARKER" 2>/dev/null || stat -c %Y "$SESSION_MARKER" 2>/dev/null || echo "0") ))
  # If marker is less than 60 seconds old, skip (already ran this session)
  if [ "$MARKER_AGE" -lt 60 ]; then
    exit 0
  fi
fi

# Mark session as active
date +%s > "$SESSION_MARKER" 2>/dev/null

# Find the most recent snapshot
LATEST_SNAPSHOT=""
if [ -d "$SNAPSHOTS_DIR" ]; then
  LATEST_SNAPSHOT=$(ls -t "$SNAPSHOTS_DIR"/pre-compact-*.md 2>/dev/null | head -1)
fi

# Build session context
PHASE="unknown"
if [ -f "$HOOL_DIR/operations/current-phase.md" ]; then
  PHASE=$(head -3 "$HOOL_DIR/operations/current-phase.md" | tr '\n' ' ' | sed 's/[[:space:]]*$//')
fi

PENDING=0
if [ -f "$HOOL_DIR/operations/task-board.md" ]; then
  PENDING=$(grep -c '^\- \[ \]' "$HOOL_DIR/operations/task-board.md" 2>/dev/null | tr -d '\n' || echo "0")
fi

SNAPSHOT_INFO=""
if [ -n "$LATEST_SNAPSHOT" ]; then
  SNAPSHOT_INFO=" | Last snapshot: $(basename "$LATEST_SNAPSHOT")"
fi

CONTEXT="HOOL SESSION RESUMED | Phase: ${PHASE} | Pending tasks: ${PENDING}${SNAPSHOT_INFO} | ACTION: Read .hool/operations/current-phase.md and .hool/operations/task-board.md immediately. If there are pending tasks, tell the user and ask if you should proceed."

printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$CONTEXT"

exit 0
