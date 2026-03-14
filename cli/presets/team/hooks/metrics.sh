#!/bin/bash
# Hook: Metrics
# Trigger: PostToolUse (every tool call)
# Purpose: Track total tool calls globally

set -euo pipefail

METRICS_FILE=".hool/operations/metrics.md"

# Ensure metrics file exists
if [ ! -f "$METRICS_FILE" ]; then
  cat > "$METRICS_FILE" << 'INIT'
# Metrics

- tool-calls: 0
- task-completions: 0
INIT
fi

# Increment total tool calls (BSD sed compatible)
current_total=$(sed -n 's/.*tool-calls: *\([0-9]*\).*/\1/p' "$METRICS_FILE" 2>/dev/null | head -1)
current_total=${current_total:-0}
new_total=$((current_total + 1))
sed -i '' "s/tool-calls: ${current_total}/tool-calls: ${new_total}/" "$METRICS_FILE" 2>/dev/null || true
