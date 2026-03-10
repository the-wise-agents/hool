#!/bin/bash
# Hook: Post-agent operational checklist reminder
# Type: Stop and SubagentStop
# Injects a reminder asking if the agent completed its operational duties

echo "OPERATIONAL CHECKLIST — Did you complete these before finishing?"
echo "[ ] Updated memory/cold.md with work log entries"
echo "[ ] Rebuilt memory/hot.md from cold log"
echo "[ ] Moved [GOTCHA]/[PATTERN] entries to best-practices.md"
echo "[ ] Logged any issues to operations/issues.md"
echo "[ ] Logged any inconsistencies to operations/inconsistencies.md"
echo "[ ] Marked task complete on operations/task-board.md"
echo "[ ] Verified no governor-feedback.md violations in your output"
echo ""
echo "If any items are incomplete, address them now before returning."

exit 0
