#!/bin/bash
# Hook: Block Product Lead (main agent) from writing to src/ directly
# Type: PreToolUse on Edit, Write
# Reads CLAUDE_TOOL_INPUT from stdin (JSON)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

# Check if the file is in src/ or tests/
if echo "$FILE_PATH" | grep -qE '(^|/)src/|(^|/)tests/'; then
  # This is the main agent trying to edit application code
  # Subagents have their own identity and writable paths — they're allowed
  # But we can't distinguish main vs subagent here, so we block at main level
  # The hook only runs for the main conversation (PreToolUse)
  echo "BLOCKED: Product Lead cannot edit files in src/ or tests/ directly."
  echo "Dispatch the assigned agent (be-dev, fe-dev, qa) to make this change."
  echo "See CLAUDE.md Forbidden Actions section."
  exit 2
fi

exit 0
