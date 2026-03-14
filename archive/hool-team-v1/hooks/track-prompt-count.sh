#!/bin/bash
# Hook: Track tool calls + agent dispatches in metrics.md, trigger governor every 3 dispatches
# Type: PostToolUse
# Outputs JSON with additionalContext when governor should run

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo '.')"
METRICS_FILE="$PROJECT_ROOT/.hool/operations/metrics.md"

# Ensure metrics file exists with default counters
if [ ! -f "$METRICS_FILE" ]; then
  mkdir -p "$(dirname "$METRICS_FILE")"
  cat > "$METRICS_FILE" <<'EOF'
# HOOL Metrics
- Agent dispatches: 0
- Tool calls: 0
- User prompts: 0
EOF
fi

# Increment tool calls counter
CURRENT_TOOLS=$(grep -o 'Tool calls: [0-9]*' "$METRICS_FILE" | grep -o '[0-9]*')
CURRENT_TOOLS=${CURRENT_TOOLS:-0}
NEXT_TOOLS=$((CURRENT_TOOLS + 1))
sed -i '' "s/Tool calls: ${CURRENT_TOOLS}/Tool calls: ${NEXT_TOOLS}/" "$METRICS_FILE"

# Read stdin to check tool name
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"tool_name"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

if [ "$TOOL_NAME" = "Agent" ]; then
  # Increment agent dispatches counter
  CURRENT_DISPATCHES=$(grep -o 'Agent dispatches: [0-9]*' "$METRICS_FILE" | grep -o '[0-9]*')
  CURRENT_DISPATCHES=${CURRENT_DISPATCHES:-0}
  NEXT_DISPATCHES=$((CURRENT_DISPATCHES + 1))
  sed -i '' "s/Agent dispatches: ${CURRENT_DISPATCHES}/Agent dispatches: ${NEXT_DISPATCHES}/" "$METRICS_FILE"

  # Check if divisible by 3
  if [ $((NEXT_DISPATCHES % 3)) -eq 0 ]; then
    # Output JSON to inject governor reminder into conversation
    cat <<'JSONEOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "GOVERNOR CHECK: You have completed 3 agent dispatches since the last governor audit. Run the governor NOW before dispatching any more agents. Dispatch the governor agent (.claude/agents/governor.md) to audit recent agent activity."
  }
}
JSONEOF
    exit 0
  fi
fi

exit 0
