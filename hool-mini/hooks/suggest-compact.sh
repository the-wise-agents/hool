#!/bin/bash
# Hook: Suggest strategic /compact at logical intervals
# Type: PreToolUse on Edit|Write
# Why: Auto-compact happens at arbitrary points, often mid-task.
#       Strategic compaction between phases preserves better context.

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo '.')"
METRICS_FILE="$PROJECT_ROOT/.hool/operations/metrics.md"
THRESHOLD="${HOOL_COMPACT_THRESHOLD:-50}"

# Read tool call count from metrics.md (format: "- Tool calls: N")
COUNT=$(grep -o 'Tool calls: [0-9]*' "$METRICS_FILE" 2>/dev/null | grep -o '[0-9]*')
COUNT="${COUNT:-0}"

# Suggest at threshold
if [ "$COUNT" -eq "$THRESHOLD" ]; then
  echo "HOOL: ${THRESHOLD} tool calls reached. Consider running /compact if you're between phases or tasks." >&2
fi

# Suggest every 25 calls after threshold
if [ "$COUNT" -gt "$THRESHOLD" ]; then
  OVER=$((COUNT - THRESHOLD))
  if [ $((OVER % 25)) -eq 0 ]; then
    echo "HOOL: ${COUNT} tool calls. Good checkpoint for /compact if context feels stale." >&2
  fi
fi

exit 0
