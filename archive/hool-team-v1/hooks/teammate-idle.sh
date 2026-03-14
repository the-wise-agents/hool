#!/bin/bash
# TeammateIdle hook — runs when a teammate finishes and goes idle
# Exit code 2 = send feedback and keep the teammate working
# Exit code 0 = allow the teammate to go idle

HOOL_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Check if the teammate updated their memory files
# The teammate's role should be identifiable from context
# For now, just remind about memory updates
echo "TEAMMATE_IDLE_CHECK: Verify teammate updated .hool/memory/<role>/ files before shutdown."

exit 0
