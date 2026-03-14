#!/bin/bash
# Hook Profile Wrapper — conditionally runs a hook based on HOOL_HOOK_PROFILE
# Usage: run-if-profile.sh <required-profiles-csv> <actual-hook-script>
# Example: run-if-profile.sh "standard,strict" ".hool/hooks/suggest-compact.sh"
#
# Profile levels:
#   minimal  — only safety-critical hooks (block-pl-src-write, pre-compact)
#   standard — default: safety + operational (all hooks except strict-only)
#   strict   — maximum guardrails: all hooks active
#
# Set via: export HOOL_HOOK_PROFILE=minimal|standard|strict
# Default: standard

REQUIRED_PROFILES="$1"
HOOK_SCRIPT="$2"

if [ -z "$HOOK_SCRIPT" ]; then
  echo "Usage: run-if-profile.sh <profiles-csv> <hook-script>" >&2
  exit 0
fi

# Default profile
CURRENT_PROFILE="${HOOL_HOOK_PROFILE:-standard}"

# Check if current profile is in the required list
ENABLED=false
IFS=',' read -ra PROFILES <<< "$REQUIRED_PROFILES"
for profile in "${PROFILES[@]}"; do
  profile=$(echo "$profile" | tr -d ' ')
  if [ "$profile" = "$CURRENT_PROFILE" ]; then
    ENABLED=true
    break
  fi
done

if [ "$ENABLED" = false ]; then
  # Pass through stdin unchanged
  cat
  exit 0
fi

# Profile matches — run the actual hook, passing stdin through
exec bash "$HOOK_SCRIPT"
