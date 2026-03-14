#!/bin/bash
# Hook: Login Nudge
# Trigger: Called by PL before first QA run or when authenticated testing is needed
# Purpose: Prompt user to manually log into the shared browser profile
#
# All agents share a single browser profile at .hool/browser-profiles/shared/
# via --user-data-dir. User logs in once via headful mode, all agents (headless
# and headful) get the same auth state.

set -euo pipefail

SHARED_PROFILE=".hool/browser-profiles/shared"
mkdir -p "$SHARED_PROFILE"

echo "============================================"
echo "  BROWSER PROFILE LOGIN REQUIRED"
echo "============================================"
echo ""
echo "Agents need an authenticated browser session to test login-protected flows."
echo "All agents share a single browser profile at: ${SHARED_PROFILE}/"
echo ""
echo "============================================"
echo "  HOW TO LOG IN"
echo "============================================"
echo ""
echo "Run:"
echo ""
echo "  playwright-mcp --user-data-dir ${SHARED_PROFILE}"
echo ""
echo "This opens a visible browser with the shared profile."
echo "Log into all required services, then close the browser."
echo "The auth state persists for all agents in both headless and headful modes."
echo ""
echo "After logging in, tell the Product Lead you're done."
echo "============================================"

# Output for hook system
cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "LOGIN NUDGE: Shared browser profile needs user login before agents can test authenticated flows. Profile: .hool/browser-profiles/shared/. Ask the user to run: playwright-mcp --user-data-dir .hool/browser-profiles/shared — log into required services, then close the browser."
  }
}
EOF
