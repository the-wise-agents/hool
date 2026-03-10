#!/bin/bash
# Hook: Suggest strategic /compact at logical intervals
# Type: PreToolUse on Edit|Write
# Why: Auto-compact happens at arbitrary points, often mid-task.
#       Strategic compaction between phases preserves better context.

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo '.')"
METRICS_DIR="$PROJECT_ROOT/.hool/metrics"
mkdir -p "$METRICS_DIR"

COUNTER_FILE="$METRICS_DIR/tool-call-count.txt"
THRESHOLD="${HOOL_COMPACT_THRESHOLD:-50}"

# Read and increment counter
CURRENT=$(cat "$COUNTER_FILE" 2>/dev/null || echo "0")
NEXT=$((CURRENT + 1))
echo "$NEXT" > "$COUNTER_FILE"

# Suggest at threshold
if [ "$NEXT" -eq "$THRESHOLD" ]; then
  echo "HOOL: ${THRESHOLD} tool calls reached. Consider running /compact if you're between phases or tasks." >&2
fi

# Suggest every 25 calls after threshold
if [ "$NEXT" -gt "$THRESHOLD" ]; then
  OVER=$((NEXT - THRESHOLD))
  if [ $((OVER % 25)) -eq 0 ]; then
    echo "HOOL: ${NEXT} tool calls. Good checkpoint for /compact if context feels stale." >&2
  fi
fi

exit 0
