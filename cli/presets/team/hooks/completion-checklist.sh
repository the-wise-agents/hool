#!/bin/bash
# Hook: Completion Checklist
# Trigger: TeammateIdle (when a teammate finishes and goes idle)
# Purpose: Check for uncommitted changes in domain repos
#
# Exit code 0 = allow idle
# Exit code 2 = send feedback, keep agent working

set -euo pipefail

ISSUES=()

# Check for uncommitted changes in FE repo
if [ -d "src/frontend/.git" ]; then
  UNCOMMITTED=$(cd src/frontend && git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
  if [ "$UNCOMMITTED" -gt 0 ]; then
    ISSUES+=("${UNCOMMITTED} uncommitted file(s) in src/frontend/ — commit your changes")
  fi
fi

# Check for uncommitted changes in BE repo
if [ -d "src/backend/.git" ]; then
  UNCOMMITTED=$(cd src/backend && git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
  if [ "$UNCOMMITTED" -gt 0 ]; then
    ISSUES+=("${UNCOMMITTED} uncommitted file(s) in src/backend/ — commit your changes")
  fi
fi

# If issues found, send feedback and keep agent working
if [ ${#ISSUES[@]} -gt 0 ]; then
  FEEDBACK="COMPLETION CHECKLIST: Fix before going idle:\n"
  for issue in "${ISSUES[@]}"; do
    FEEDBACK+="- ${issue}\n"
  done
  echo -e "$FEEDBACK" >&2
  exit 2
fi

exit 0
