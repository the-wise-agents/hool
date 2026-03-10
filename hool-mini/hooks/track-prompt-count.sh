#!/bin/bash
# Hook: Track prompt/tool count and trigger governor every 3 dispatches
# Type: PostToolUse
# Outputs JSON with additionalContext when governor should run

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo '.')"
METRICS_DIR="$PROJECT_ROOT/.hool/metrics"
mkdir -p "$METRICS_DIR"

COUNTER_FILE="$METRICS_DIR/prompt-count.log"
SESSION_FILE="$METRICS_DIR/current-session.txt"
DISPATCH_FILE="$METRICS_DIR/dispatch-count.txt"

# Get or create session ID
if [ ! -f "$SESSION_FILE" ]; then
  echo "session-$(date +%Y%m%d-%H%M%S)" > "$SESSION_FILE"
fi

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Append to log
echo "$TIMESTAMP | tool-call" >> "$COUNTER_FILE"

# Track dispatch count (Agent tool calls specifically)
# Read from stdin to check tool name
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"tool_name"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

if [ "$TOOL_NAME" = "Agent" ]; then
  # Increment dispatch counter
  CURRENT=$(cat "$DISPATCH_FILE" 2>/dev/null || echo "0")
  NEXT=$((CURRENT + 1))
  echo "$NEXT" > "$DISPATCH_FILE"

  # Check if divisible by 3
  if [ $((NEXT % 3)) -eq 0 ]; then
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
