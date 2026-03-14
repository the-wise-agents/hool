#!/bin/bash
# Hook: Save HOOL state snapshot before context compaction
# Type: PreCompact
# Why: Context compaction can lose critical phase/task state.
#       This hook preserves a snapshot so the agent can recover on resume.

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo '.')"
HOOL_DIR="$PROJECT_ROOT/.hool"
SNAPSHOTS_DIR="$HOOL_DIR/metrics/snapshots"
mkdir -p "$SNAPSHOTS_DIR"

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
SNAPSHOT_FILE="$SNAPSHOTS_DIR/pre-compact-$TIMESTAMP.md"

# Capture current phase
PHASE="unknown"
if [ -f "$HOOL_DIR/operations/current-phase.md" ]; then
  PHASE=$(head -10 "$HOOL_DIR/operations/current-phase.md")
fi

# Capture pending task count and first 5 pending tasks
PENDING_TASKS=""
if [ -f "$HOOL_DIR/operations/task-board.md" ]; then
  PENDING_TASKS=$(grep '^\- \[ \]' "$HOOL_DIR/operations/task-board.md" 2>/dev/null | head -5)
fi

# Capture last 10 entries from PL cold log
RECENT_LOG=""
if [ -f "$HOOL_DIR/memory/product-lead/cold.md" ]; then
  RECENT_LOG=$(tail -10 "$HOOL_DIR/memory/product-lead/cold.md")
fi

# Capture items needing human review
REVIEW_COUNT=0
if [ -f "$HOOL_DIR/operations/needs-human-review.md" ]; then
  REVIEW_COUNT=$(grep -c '^##\|^- ' "$HOOL_DIR/operations/needs-human-review.md" 2>/dev/null | tr -d '\n' || echo "0")
fi

# Capture dispatch count
DISPATCH_COUNT=0
if [ -f "$HOOL_DIR/metrics/dispatch-count.txt" ]; then
  DISPATCH_COUNT=$(cat "$HOOL_DIR/metrics/dispatch-count.txt" 2>/dev/null | tr -d '\n' || echo "0")
fi

# Write snapshot
cat > "$SNAPSHOT_FILE" << SNAPSHOT
# HOOL Pre-Compaction Snapshot
**Timestamp:** $TIMESTAMP
**Dispatch count:** $DISPATCH_COUNT
**Human review items:** $REVIEW_COUNT

## Current Phase
$PHASE

## Pending Tasks (first 5)
$PENDING_TASKS

## Recent Activity (last 10 cold log entries)
$RECENT_LOG
SNAPSHOT

# Also inject context into the conversation so the agent doesn't lose state
PHASE_ONELINER=$(echo "$PHASE" | head -1 | tr -d '\n')
TASK_COUNT=$(echo "$PENDING_TASKS" | grep -c '.' 2>/dev/null | tr -d '\n' || echo "0")

cat << JSONEOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreCompact",
    "additionalContext": "HOOL STATE SNAPSHOT (pre-compaction): Phase: ${PHASE_ONELINER} | Pending tasks: ${TASK_COUNT} | Dispatches: ${DISPATCH_COUNT} | Review items: ${REVIEW_COUNT} | IMPORTANT: After compaction, re-read .hool/operations/current-phase.md and .hool/operations/task-board.md to restore full context. Snapshot saved to ${SNAPSHOT_FILE}"
  }
}
JSONEOF

exit 0
