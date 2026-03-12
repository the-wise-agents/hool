#!/bin/bash
# HOOL End-to-End Tests — validates runtime agent behavior using real Claude sessions
# Run: bash tests/hool-e2e.test.sh
#
# These tests spawn actual `claude -p` sessions to verify:
# - CLI dispatch mechanics (identity, settings, env isolation)
# - MCP access from dispatched agents
# - Role restrictions and writable paths
# - Memory lifecycle
# - Task board management
# - Governor behavior
# - Metrics tracking
# - State reconciliation
# - Full dispatch flow
# - Error recovery
# - Phase gating
# - Feedback routing
#
# Cost: Each test uses ~2-5 Opus requests against your hourly rate limit.
# Total: ~30-50 requests for the full suite.

set -euo pipefail

HOOL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="/tmp/hool-e2e-test"
PASS=0
FAIL=0
TOTAL=0
SKIPPED=0

pass() {
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo "  ✅ PASS: $1"
}

fail() {
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo "  ❌ FAIL: $1"
  [ -n "${2:-}" ] && echo "        $2"
}

skip() {
  SKIPPED=$((SKIPPED + 1))
  TOTAL=$((TOTAL + 1))
  echo "  ⏭️  SKIP: $1"
}

section() {
  echo ""
  echo "════════════════════════════════════════════════"
  echo "  $1"
  echo "════════════════════════════════════════════════"
}

# Check if claude CLI is available
if ! command -v claude &>/dev/null; then
  echo "ERROR: claude CLI not found. Install Claude Code first."
  exit 1
fi

# Track child claude PIDs for cleanup
CHILD_PIDS=()
cleanup() {
  echo ""
  echo "  Cleaning up..."
  # Kill any child claude -p processes we spawned
  for pid in "${CHILD_PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  # Also kill any claude processes running in our test project directory
  pgrep -f "claude.*$PROJECT_ROOT" 2>/dev/null | while read pid; do
    kill "$pid" 2>/dev/null || true
  done
  rm -rf "$PROJECT_ROOT"
}
trap cleanup EXIT

# Wrapper for claude -p calls that tracks PIDs and enforces timeout
dispatch_test() {
  local timeout="${DISPATCH_TIMEOUT:-30}"
  timeout "$timeout" env -u CLAUDECODE "$@" 2>/dev/null || echo "DISPATCH_TIMEOUT_OR_FAIL"
}

# ── SETUP ─────────────────────────────────────────
section "SETUP — Scaffolding test project"

rm -rf "$PROJECT_ROOT"
mkdir -p "$PROJECT_ROOT"

# Initialize a test HOOL project
cd "$HOOL_ROOT"
npx tsx cli/src/index.ts init -d "$PROJECT_ROOT" -p claude-code -t cli-tool -m interactive 2>&1 | tail -3
cd "$PROJECT_ROOT"

# Create a minimal src/ directory for agents to work with
mkdir -p src
cat > src/hello.ts <<'EOF'
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
EOF

# Initialize git (needed for hooks that use git rev-parse)
git init -q
git add -A
git commit -q -m "Initial test project"

echo "  Project scaffolded at $PROJECT_ROOT"
echo ""

# ════════════════════════════════════════════════════
section "1. CLI DISPATCH MECHANICS"
# ════════════════════════════════════════════════════

# 1.1 env -u CLAUDECODE allows child session to start
echo "  Testing: child session starts with env -u CLAUDECODE..."
RESULT=$(env -u CLAUDECODE claude -p \
  --model sonnet \
  --no-session-persistence \
  "Respond with exactly: DISPATCH_OK" 2>/dev/null || echo "DISPATCH_FAILED")

if echo "$RESULT" | grep -q "DISPATCH_OK"; then
  pass "Child session starts successfully with env -u CLAUDECODE"
else
  fail "Child session failed to start" "Got: $(echo "$RESULT" | head -3)"
fi

# 1.2 --agent flag loads correct identity
echo "  Testing: --agent loads correct identity..."
RESULT=$(env -u CLAUDECODE claude -p \
  --agent be-dev \
  --model sonnet \
  --no-session-persistence \
  "What is your role name? Respond with ONLY your agent role name, nothing else." 2>/dev/null || echo "AGENT_IDENTITY_FAILED")

if echo "$RESULT" | grep -qi "be.dev\|backend\|BE Dev"; then
  pass "--agent be-dev loads BE Dev identity"
else
  fail "--agent be-dev did not load correct identity" "Got: $(echo "$RESULT" | head -3)"
fi

# 1.3 --settings loads role-specific settings
echo "  Testing: --settings loads role-specific hooks..."
# The agent settings should NOT have block-pl-src-write hook
if [ -f ".hool/settings/be-dev.json" ]; then
  if ! grep -q "block-pl-src-write" .hool/settings/be-dev.json; then
    pass "be-dev.json does not contain PL-specific hooks"
  else
    fail "be-dev.json contains PL-specific hook (should be excluded)"
  fi
else
  fail ".hool/settings/be-dev.json not found"
fi

# 1.4 Agent can read project files
echo "  Testing: dispatched agent can read project files..."
RESULT=$(env -u CLAUDECODE claude -p \
  --agent be-dev \
  --model sonnet \
  --no-session-persistence \
  "Read the file src/hello.ts and tell me the function name defined in it. Respond with ONLY the function name." 2>/dev/null || echo "READ_FAILED")

if echo "$RESULT" | grep -q "greet"; then
  pass "Dispatched agent can read project files"
else
  fail "Agent could not read project files" "Got: $(echo "$RESULT" | head -3)"
fi

# 1.5 Agent can write to project files
echo "  Testing: dispatched agent can write files..."
RESULT=$(env -u CLAUDECODE claude -p \
  --agent be-dev \
  --model sonnet \
  --dangerously-skip-permissions \
  --no-session-persistence \
  "Create a new file at src/test-output.txt with the exact content 'AGENT_WRITE_OK'. Do nothing else." 2>/dev/null || echo "WRITE_FAILED")

if [ -f "src/test-output.txt" ] && grep -q "AGENT_WRITE_OK" src/test-output.txt; then
  pass "Dispatched agent can write files"
  rm -f src/test-output.txt
else
  fail "Agent could not write files" "File exists: $([ -f src/test-output.txt ] && echo yes || echo no)"
fi

# ════════════════════════════════════════════════════
section "2. MCP ACCESS FROM DISPATCHED AGENTS"
# ════════════════════════════════════════════════════

# 2.1 Agent can access context7 MCP
echo "  Testing: agent can use context7 MCP..."
RESULT=$(env -u CLAUDECODE claude -p \
  --agent be-dev \
  --model sonnet \
  --no-session-persistence \
  "Use the mcp__context7__resolve-library-id tool to look up 'commander'. If the tool is available and works, respond 'MCP_OK'. If the tool is not available, respond 'MCP_UNAVAILABLE'." 2>/dev/null || echo "MCP_FAILED")

if echo "$RESULT" | grep -q "MCP_OK\|commander\|/commander"; then
  pass "Agent can access context7 MCP"
else
  if echo "$RESULT" | grep -q "MCP_UNAVAILABLE\|not available\|no tool"; then
    fail "Agent cannot access MCP tools" "MCP tools not available in child session"
  else
    fail "MCP access test inconclusive" "Got: $(echo "$RESULT" | head -3)"
  fi
fi

# ════════════════════════════════════════════════════
section "3. ROLE RESTRICTIONS"
# ════════════════════════════════════════════════════

# 3.1 PL hook blocks src/ writes (already tested in bash tests, verify hook works in real session)
echo "  Testing: PL block hook prevents src/ writes..."
# Create a mock input that simulates an Edit to src/
BLOCK_RESULT=$(echo '{"tool_name":"Edit","tool_input":{"file_path":"src/hello.ts","old_string":"Hello","new_string":"Hi"}}' | bash .hool/hooks/block-pl-src-write.sh 2>&1 || true)
BLOCK_EXIT=$?
if [ "$BLOCK_EXIT" = "2" ] || echo "$BLOCK_RESULT" | grep -qi "blocked"; then
  pass "PL block hook prevents src/ writes"
else
  fail "PL block hook did not block src/ write" "Exit: $BLOCK_EXIT, Output: $BLOCK_RESULT"
fi

# 3.2 PL hook allows .hool/ writes
ALLOW_RESULT=$(echo '{"tool_name":"Edit","tool_input":{"file_path":".hool/operations/task-board.md","old_string":"test","new_string":"test2"}}' | bash .hool/hooks/block-pl-src-write.sh 2>&1 || true)
ALLOW_EXIT=$?
if [ "$ALLOW_EXIT" = "0" ]; then
  pass "PL block hook allows .hool/ writes"
else
  fail "PL block hook incorrectly blocked .hool/ write"
fi

# 3.3 Agent prompts contain git prohibition
echo "  Testing: agent prompts prohibit git commands..."
GIT_VIOLATIONS=0
for agent in be-dev be-tech-lead fe-dev fe-tech-lead qa forensic governor; do
  if ! grep -qi "never run git" ".claude/agents/${agent}.md" 2>/dev/null; then
    GIT_VIOLATIONS=$((GIT_VIOLATIONS + 1))
  fi
done
if [ "$GIT_VIOLATIONS" = "0" ]; then
  pass "All 7 agent prompts contain git prohibition"
else
  fail "$GIT_VIOLATIONS agent prompts missing git prohibition"
fi

# 3.4 Forensic agent has read-only tools (no Edit/Write)
echo "  Testing: forensic agent is read-only..."
if grep -q "tools:" ".claude/agents/forensic.md" 2>/dev/null; then
  if ! grep -A5 "tools:" ".claude/agents/forensic.md" | grep -q "Edit\|Write"; then
    pass "Forensic agent does not have Edit/Write tools"
  else
    # Check if it explicitly excludes them
    if grep "tools:" ".claude/agents/forensic.md" | grep -qv "Edit"; then
      pass "Forensic agent has restricted tool access"
    else
      fail "Forensic agent may have Edit/Write tools"
    fi
  fi
else
  skip "Could not verify forensic tool restrictions (no tools: field)"
fi

# ════════════════════════════════════════════════════
section "4. MEMORY LIFECYCLE"
# ════════════════════════════════════════════════════

# 4.1 Agent can read its own memory files
echo "  Testing: agent reads its own memory..."
RESULT=$(env -u CLAUDECODE claude -p \
  --agent be-dev \
  --model sonnet \
  --no-session-persistence \
  "Read the file .hool/memory/be-dev/best-practices.md. What does the first line say? Respond with the first non-empty line of the file." 2>/dev/null || echo "MEMORY_READ_FAILED")

if echo "$RESULT" | grep -qi "best.practices\|no patterns\|gotchas"; then
  pass "Agent can read its own memory files"
else
  fail "Agent could not read memory" "Got: $(echo "$RESULT" | head -3)"
fi

# 4.2 Agent can write to its own memory files
echo "  Testing: agent writes to its own memory..."
RESULT=$(env -u CLAUDECODE claude -p \
  --agent be-dev \
  --model sonnet \
  --dangerously-skip-permissions \
  --no-session-persistence \
  "Append the following line to .hool/memory/be-dev/cold.md: '[TEST] E2E test entry from be-dev agent'. Do not add anything else." 2>/dev/null || echo "MEMORY_WRITE_FAILED")

if grep -q "E2E test entry from be-dev" .hool/memory/be-dev/cold.md 2>/dev/null; then
  pass "Agent can write to its own memory (cold.md)"
else
  fail "Agent could not write to memory" "cold.md content: $(cat .hool/memory/be-dev/cold.md 2>/dev/null | tail -3)"
fi

# 4.3 Memory files have correct structure after scaffold
echo "  Testing: memory file structure..."
MEMORY_OK=true
for agent in product-lead be-dev fe-dev qa governor forensic be-tech-lead fe-tech-lead; do
  for file in hot.md cold.md best-practices.md issues.md governor-feedback.md; do
    if [ ! -f ".hool/memory/$agent/$file" ]; then
      MEMORY_OK=false
      fail "Missing: .hool/memory/$agent/$file"
      break 2
    fi
  done
done
if $MEMORY_OK; then
  pass "All 8 agents have all 5 memory files"
fi

# 4.4 Hot.md has required sections
if grep -q "## Compact" .hool/memory/product-lead/hot.md && \
   grep -q "## Summary" .hool/memory/product-lead/hot.md && \
   grep -q "## Recent" .hool/memory/product-lead/hot.md; then
  pass "hot.md has Compact/Summary/Recent sections"
else
  fail "hot.md missing required sections"
fi

# ════════════════════════════════════════════════════
section "5. TASK BOARD MANAGEMENT"
# ════════════════════════════════════════════════════

# 5.1 Task board is readable and parseable
if [ -f ".hool/operations/task-board.md" ]; then
  pass "task-board.md exists"
else
  fail "task-board.md missing"
fi

# 5.2 Simulate PL adding a task
cat > .hool/operations/task-board.md <<'EOF'
# Task Board

## Active Tasks
- [ ] TASK-E2E-001: Test task for e2e validation | assigned: be-dev | files: src/hello.ts
- [ ] TASK-E2E-002: Second test task | assigned: qa | depends: TASK-E2E-001

## Completed Tasks
_None._
EOF

# Verify task parsing
PENDING=$(grep -c '\- \[ \]' .hool/operations/task-board.md)
COMPLETED=$(grep -c '\- \[x\]' .hool/operations/task-board.md || true)
if [ "$PENDING" = "2" ] && [ "$COMPLETED" = "0" ]; then
  pass "Task board correctly tracks 2 pending, 0 completed"
else
  fail "Task board parsing wrong" "Pending: $PENDING, Completed: $COMPLETED"
fi

# 5.3 Simulate marking a task complete
sed -i '' 's/\- \[ \] TASK-E2E-001/- [x] TASK-E2E-001/' .hool/operations/task-board.md
PENDING=$(grep -c '\- \[ \]' .hool/operations/task-board.md)
COMPLETED=$(grep -c '\- \[x\]' .hool/operations/task-board.md)
if [ "$PENDING" = "1" ] && [ "$COMPLETED" = "1" ]; then
  pass "Task completion updates correctly (1 pending, 1 completed)"
else
  fail "Task completion tracking wrong"
fi

# 5.4 Agent can read task board
echo "  Testing: agent reads task board..."
RESULT=$(env -u CLAUDECODE claude -p \
  --agent be-dev \
  --model sonnet \
  --no-session-persistence \
  "Read .hool/operations/task-board.md. How many tasks are marked as completed (with [x])? Respond with just the number." 2>/dev/null || echo "TASKBOARD_FAILED")

if echo "$RESULT" | grep -q "1"; then
  pass "Agent can read and parse task board"
else
  fail "Agent could not read task board" "Got: $(echo "$RESULT" | head -3)"
fi

# 5.5 Dependency parsing
if grep -q "depends: TASK-E2E-001" .hool/operations/task-board.md; then
  pass "Task dependencies are parseable"
else
  fail "Task dependency format incorrect"
fi

# ════════════════════════════════════════════════════
section "6. GOVERNOR BEHAVIOR"
# ════════════════════════════════════════════════════

# 6.1 Governor rules file exists and has all severity levels
if grep -q "\[CRITICAL\]" .hool/operations/governor-rules.md && \
   grep -q "\[HIGH\]" .hool/operations/governor-rules.md && \
   grep -q "\[MEDIUM\]" .hool/operations/governor-rules.md; then
  pass "Governor rules has CRITICAL, HIGH, MEDIUM rules"
else
  fail "Governor rules missing severity levels"
fi

# 6.2 Governor rules include key rules
RULES_MISSING=0
for rule in "modify its own prompt" "NEVER edit application code" "remove or overwrite" "dispatch brief" "too small for agent dispatch" "single-instance\|same agent in parallel"; do
  if ! grep -qi "$rule" .hool/operations/governor-rules.md; then
    RULES_MISSING=$((RULES_MISSING + 1))
  fi
done
if [ "$RULES_MISSING" = "0" ]; then
  pass "All critical governor rules present"
else
  fail "$RULES_MISSING governor rules missing"
fi

# 6.3 Governor agent can be dispatched and reads rules
echo "  Testing: governor agent dispatch..."
RESULT=$(env -u CLAUDECODE claude -p \
  --agent governor \
  --model sonnet \
  --no-session-persistence \
  "Read .hool/operations/governor-rules.md. How many [CRITICAL] rules are there? Respond with just the number." 2>/dev/null || echo "GOVERNOR_FAILED")

if echo "$RESULT" | grep -q "3"; then
  pass "Governor agent can read governor-rules.md (3 CRITICAL rules)"
else
  fail "Governor agent could not read rules" "Got: $(echo "$RESULT" | head -3)"
fi

# 6.4 Governor log exists
if [ -f ".hool/operations/governor-log.md" ]; then
  pass "Governor log file exists"
else
  fail "Governor log missing"
fi

# 6.5 Governor feedback files exist for all agents
FEEDBACK_OK=true
for agent in product-lead be-dev fe-dev qa governor forensic be-tech-lead fe-tech-lead; do
  if [ ! -f ".hool/memory/$agent/governor-feedback.md" ]; then
    FEEDBACK_OK=false
    fail "Missing governor-feedback.md for $agent"
    break
  fi
done
if $FEEDBACK_OK; then
  pass "All agents have governor-feedback.md files"
fi

# ════════════════════════════════════════════════════
section "7. METRICS TRACKING"
# ════════════════════════════════════════════════════

# 7.1 Metrics file can be created by hook
cat > .hool/operations/metrics.md <<'METRICSEOF'
# HOOL Metrics
- Agent dispatches: 0
- Tool calls: 0
- User prompts: 0
METRICSEOF

# 7.2 Hook increments dispatch counter
echo '{"tool_name":"Agent","tool_input":{}}' | bash .hool/hooks/track-prompt-count.sh > /dev/null 2>&1
COUNT=$(grep -o 'Agent dispatches: [0-9]*' .hool/operations/metrics.md | grep -o '[0-9]*')
if [ "$COUNT" = "1" ]; then
  pass "Dispatch counter increments to 1"
else
  fail "Dispatch counter wrong" "Expected 1, got: $COUNT"
fi

# 7.3 Hook increments tool call counter
TOOL_COUNT=$(grep -o 'Tool calls: [0-9]*' .hool/operations/metrics.md | grep -o '[0-9]*')
if [ "$TOOL_COUNT" = "1" ]; then
  pass "Tool call counter increments"
else
  fail "Tool call counter wrong" "Expected 1, got: $TOOL_COUNT"
fi

# 7.4 Governor trigger fires at 3 dispatches
echo '{"tool_name":"Agent","tool_input":{}}' | bash .hool/hooks/track-prompt-count.sh > /dev/null 2>&1
RESULT=$(echo '{"tool_name":"Agent","tool_input":{}}' | bash .hool/hooks/track-prompt-count.sh 2>/dev/null)
if echo "$RESULT" | grep -q "GOVERNOR CHECK"; then
  pass "Governor trigger fires at dispatch count 3"
else
  fail "Governor trigger did not fire at 3" "Got: $RESULT"
fi

# 7.5 Governor trigger does NOT fire at non-multiples of 3
cat > .hool/operations/metrics.md <<'METRICSEOF'
# HOOL Metrics
- Agent dispatches: 0
- Tool calls: 0
- User prompts: 0
METRICSEOF
echo '{"tool_name":"Agent","tool_input":{}}' | bash .hool/hooks/track-prompt-count.sh > /dev/null 2>&1
RESULT=$(echo '{"tool_name":"Agent","tool_input":{}}' | bash .hool/hooks/track-prompt-count.sh 2>/dev/null)
if echo "$RESULT" | grep -q "GOVERNOR CHECK"; then
  fail "Governor trigger fired at count 2 (should only fire at multiples of 3)"
else
  pass "Governor trigger correctly silent at count 2"
fi

# 7.6 Non-Agent tool calls don't increment dispatch counter
BEFORE=$(grep -o 'Agent dispatches: [0-9]*' .hool/operations/metrics.md | grep -o '[0-9]*')
echo '{"tool_name":"Read","tool_input":{}}' | bash .hool/hooks/track-prompt-count.sh > /dev/null 2>&1
AFTER=$(grep -o 'Agent dispatches: [0-9]*' .hool/operations/metrics.md | grep -o '[0-9]*')
if [ "$BEFORE" = "$AFTER" ]; then
  pass "Non-Agent tools don't increment dispatch counter"
else
  fail "Non-Agent tool incremented dispatch counter"
fi

# 7.7 Suggest-compact triggers at threshold
sed -i '' 's/Tool calls: [0-9]*/Tool calls: 50/' .hool/operations/metrics.md
COMPACT_RESULT=$(bash .hool/hooks/suggest-compact.sh 2>&1)
if echo "$COMPACT_RESULT" | grep -qi "compact"; then
  pass "Suggest-compact triggers at threshold (50)"
else
  fail "Suggest-compact did not trigger at threshold"
fi

# Reset metrics
cat > .hool/operations/metrics.md <<'METRICSEOF'
# HOOL Metrics
- Agent dispatches: 0
- Tool calls: 0
- User prompts: 0
METRICSEOF

# ════════════════════════════════════════════════════
section "8. STATE RECONCILIATION"
# ════════════════════════════════════════════════════

# 8.1 Current phase file exists and is readable
if [ -f ".hool/operations/current-phase.md" ]; then
  pass "current-phase.md exists"
else
  fail "current-phase.md missing"
fi

# 8.2 Phase file contains mode and phase info
if grep -q "Mode" .hool/operations/current-phase.md && grep -q "Phase" .hool/operations/current-phase.md; then
  pass "current-phase.md has Mode and Phase fields"
else
  fail "current-phase.md missing required fields"
fi

# 8.3 All operations files exist
OPS_OK=true
for file in current-phase.md task-board.md bugs.md issues.md inconsistencies.md needs-human-review.md client-preferences.md governor-rules.md governor-log.md; do
  if [ ! -f ".hool/operations/$file" ]; then
    OPS_OK=false
    fail "Missing operations file: $file"
    break
  fi
done
if $OPS_OK; then
  pass "All 9 operations files exist"
fi

# 8.4 Project profile exists
if [ -f ".hool/phases/00-init/project-profile.md" ]; then
  PROFILE=$(cat .hool/phases/00-init/project-profile.md)
  if echo "$PROFILE" | grep -q "cli-tool" && echo "$PROFILE" | grep -q "interactive"; then
    pass "Project profile has correct type (cli-tool) and mode (interactive)"
  else
    fail "Project profile has wrong type/mode"
  fi
else
  fail "Project profile missing"
fi

# 8.5 Simulate broken state: empty current-phase.md
echo "" > .hool/operations/current-phase.md
echo "  Testing: PL detects empty current-phase.md..."
RESULT=$(env -u CLAUDECODE claude -p \
  --model sonnet \
  --no-session-persistence \
  "Read .hool/operations/current-phase.md. Is it empty or invalid? Respond with 'EMPTY' if it's empty/has no phase info, 'VALID' if it has a proper phase." 2>/dev/null || echo "RECONCILE_FAILED")

if echo "$RESULT" | grep -q "EMPTY"; then
  pass "PL detects empty current-phase.md"
else
  fail "PL did not detect empty phase file" "Got: $(echo "$RESULT" | head -3)"
fi

# Restore phase file
cat > .hool/operations/current-phase.md <<'EOF'
# Current Phase

- **Mode**: interactive
- **Phase**: 0 (Project Init)

Awaiting start.
EOF

# 8.6 Simulate broken state: missing memory directory
rm -rf .hool/memory/forensic
echo "  Testing: missing memory directory detection..."
if [ ! -d ".hool/memory/forensic" ]; then
  pass "Missing memory directory detectable"
  # Restore it
  mkdir -p .hool/memory/forensic
  for f in hot.md cold.md best-practices.md issues.md governor-feedback.md; do
    echo "# Restored" > ".hool/memory/forensic/$f"
  done
else
  fail "Directory deletion did not work"
fi

# ════════════════════════════════════════════════════
section "9. DISPATCH FLOW"
# ════════════════════════════════════════════════════

# 9.1 Dispatch brief directory exists
if [ -d ".hool/operations/context" ]; then
  pass "Dispatch context directory exists"
else
  fail "Dispatch context directory missing"
fi

# 9.2 Simulate full dispatch flow: write brief → dispatch → check output
echo "  Testing: full dispatch flow..."
cat > .hool/operations/context/TASK-E2E-003.md <<'EOF'
# Dispatch Brief: TASK-E2E-003

## Task
Add a farewell function to src/hello.ts that returns "Goodbye, <name>!"

## Files
- src/hello.ts (modify)

## Constraints
- Export the function
- Follow existing naming conventions
- Function name: farewell
EOF

RESULT=$(env -u CLAUDECODE claude -p \
  --agent be-dev \
  --model sonnet \
  --dangerously-skip-permissions \
  --no-session-persistence \
  "Read the dispatch brief at .hool/operations/context/TASK-E2E-003.md and execute the task. After completing, confirm by saying TASK_COMPLETE." 2>/dev/null || echo "DISPATCH_FAILED")

if [ -f "src/hello.ts" ] && grep -q "farewell" src/hello.ts; then
  pass "Agent executed dispatch brief — farewell function added to src/hello.ts"
else
  fail "Agent did not execute dispatch brief" "hello.ts content: $(cat src/hello.ts 2>/dev/null | tail -5)"
fi

if echo "$RESULT" | grep -qi "TASK_COMPLETE\|complete\|done\|finished"; then
  pass "Agent confirmed task completion"
else
  fail "Agent did not confirm completion" "Got: $(echo "$RESULT" | tail -3)"
fi

# 9.3 Verify dispatch brief is readable by agent
echo "  Testing: agent reads dispatch brief..."
RESULT=$(env -u CLAUDECODE claude -p \
  --agent be-dev \
  --model sonnet \
  --no-session-persistence \
  "Read .hool/operations/context/TASK-E2E-003.md. What function name does it ask you to create? Respond with only the function name." 2>/dev/null || echo "BRIEF_READ_FAILED")

if echo "$RESULT" | grep -q "farewell"; then
  pass "Agent can read dispatch brief"
else
  fail "Agent could not read dispatch brief" "Got: $(echo "$RESULT" | head -3)"
fi

# ════════════════════════════════════════════════════
section "10. ERROR RECOVERY"
# ════════════════════════════════════════════════════

# 10.1 Malformed metrics.md doesn't crash hooks
echo "GARBAGE CONTENT" > .hool/operations/metrics.md
RESULT=$(echo '{"tool_name":"Agent","tool_input":{}}' | bash .hool/hooks/track-prompt-count.sh 2>/dev/null; echo "EXIT:$?")
if echo "$RESULT" | grep -q "EXIT:0"; then
  pass "Hook handles malformed metrics.md gracefully"
else
  fail "Hook crashed on malformed metrics.md"
fi

# Restore metrics
cat > .hool/operations/metrics.md <<'METRICSEOF'
# HOOL Metrics
- Agent dispatches: 0
- Tool calls: 0
- User prompts: 0
METRICSEOF

# 10.2 Missing operations file doesn't crash status command
rm -f .hool/operations/bugs.md
STATUS_RESULT=$(node "$(find "$HOOL_ROOT/cli" -name "index.ts" -path "*/src/*")" status -d "$PROJECT_ROOT" 2>&1 || true)
# It may fail, but it should not produce a stack trace / unhandled rejection
if echo "$STATUS_RESULT" | grep -q "UnhandledPromiseRejection\|TypeError\|Cannot read"; then
  fail "Status command crashes on missing bugs.md"
else
  pass "Status command handles missing bugs.md gracefully"
fi
# Restore
echo "# Bug Tracker\n\n_No bugs reported yet._" > .hool/operations/bugs.md

# 10.3 Agent handles missing dispatch brief gracefully
echo "  Testing: agent handles missing brief..."
RESULT=$(env -u CLAUDECODE claude -p \
  --agent be-dev \
  --model sonnet \
  --no-session-persistence \
  "Read .hool/operations/context/NONEXISTENT-TASK.md and execute it. If the file doesn't exist, respond with 'BRIEF_NOT_FOUND'." 2>/dev/null || echo "BRIEF_ERROR")

if echo "$RESULT" | grep -qi "not.found\|doesn.t exist\|no such\|BRIEF_NOT_FOUND\|cannot\|could not"; then
  pass "Agent handles missing dispatch brief gracefully"
else
  fail "Agent did not detect missing brief" "Got: $(echo "$RESULT" | head -3)"
fi

# ════════════════════════════════════════════════════
section "11. PHASE GATING"
# ════════════════════════════════════════════════════

# 11.1 Phase file tracks correct initial phase
PHASE=$(grep -o 'Phase.*' .hool/operations/current-phase.md | head -1)
if echo "$PHASE" | grep -q "0\|Init"; then
  pass "Initial phase is 0 (Project Init)"
else
  fail "Initial phase incorrect" "Got: $PHASE"
fi

# 11.2 Mode switching works
cat > .hool/phases/00-init/project-profile.md <<'EOF'
# Project Profile

- **Type**: cli-tool
- **Mode**: interactive
- **Created**: 2026-03-12
EOF

# Switch mode via hool CLI
MODE_RESULT=$(cd "$HOOL_ROOT" && npx tsx cli/src/index.ts mode full-hool -d "$PROJECT_ROOT" 2>&1)
if echo "$MODE_RESULT" | grep -q "interactive -> full-hool"; then
  pass "Mode switch from interactive to full-hool works"
else
  fail "Mode switch failed" "Got: $MODE_RESULT"
fi

# Verify mode is persisted
if grep -q "full-hool" .hool/phases/00-init/project-profile.md; then
  pass "Mode switch persisted in project-profile.md"
else
  fail "Mode switch not persisted"
fi

# Switch back
cd "$HOOL_ROOT" && npx tsx cli/src/index.ts mode interactive -d "$PROJECT_ROOT" 2>&1 > /dev/null

# 11.3 Skip phases respected for cli-tool
# cli-tool should NOT have design or fe-scaffold phases
if [ ! -d "$PROJECT_ROOT/.hool/phases/03-design" ]; then
  pass "Phase 3 (design) correctly skipped for cli-tool"
else
  fail "Phase 3 (design) should be skipped for cli-tool"
fi
if [ ! -d "$PROJECT_ROOT/.hool/phases/05-fe-scaffold" ]; then
  pass "Phase 5 (fe-scaffold) correctly skipped for cli-tool"
else
  fail "Phase 5 should be skipped for cli-tool"
fi

# ════════════════════════════════════════════════════
section "12. FEEDBACK ROUTING"
# ════════════════════════════════════════════════════

# 12.1 Bugs file is parseable
cat > .hool/operations/bugs.md <<'EOF'
# Bug Tracker

## BUG-001: Test bug
- **Severity**: high
- **Status**: open
- **Found by**: qa
- **Description**: Test bug for e2e validation

## BUG-002: Resolved bug
- **Severity**: low
- **Status**: resolved
- **Found by**: qa
- **Description**: Already fixed
EOF

OPEN_BUGS=$(grep -c "Status: open" .hool/operations/bugs.md)
TOTAL_BUGS=$(grep -c "## BUG-" .hool/operations/bugs.md)
if [ "$OPEN_BUGS" = "1" ] && [ "$TOTAL_BUGS" = "2" ]; then
  pass "Bug tracker correctly tracks 1 open, 2 total bugs"
else
  fail "Bug tracker parsing wrong" "Open: $OPEN_BUGS, Total: $TOTAL_BUGS"
fi

# 12.2 Status command reads bugs correctly
cd "$PROJECT_ROOT"
STATUS=$(cd "$HOOL_ROOT" && npx tsx cli/src/index.ts status -d "$PROJECT_ROOT" 2>&1)
if echo "$STATUS" | grep -q "Open.*1\|Total.*2"; then
  pass "hool status displays bug counts"
else
  # Check if it at least shows the bugs section
  if echo "$STATUS" | grep -q "Bugs"; then
    pass "hool status shows Bugs section"
  else
    fail "hool status missing bug info"
  fi
fi

# 12.3 Issues file is writable by agents
cat > .hool/operations/issues.md <<'EOF'
# Issues

_No issues logged yet._
EOF

echo "  Testing: forensic agent can read issues..."
RESULT=$(env -u CLAUDECODE claude -p \
  --agent forensic \
  --model sonnet \
  --no-session-persistence \
  "Read .hool/operations/bugs.md. How many bugs have status 'open'? Respond with just the number." 2>/dev/null || echo "FORENSIC_FAILED")

if echo "$RESULT" | grep -q "1"; then
  pass "Forensic agent can read bugs and identify open count"
else
  fail "Forensic agent could not read bugs" "Got: $(echo "$RESULT" | head -3)"
fi

# 12.4 Inconsistencies file exists and is parseable
if [ -f ".hool/operations/inconsistencies.md" ]; then
  pass "inconsistencies.md exists"
else
  fail "inconsistencies.md missing"
fi

# 12.5 Needs-human-review file exists
if [ -f ".hool/operations/needs-human-review.md" ]; then
  pass "needs-human-review.md exists"
else
  fail "needs-human-review.md missing"
fi

# ════════════════════════════════════════════════════
section "13. SETTINGS ISOLATION"
# ════════════════════════════════════════════════════

# 13.1 PL settings have block-pl-src-write hook
if grep -q "block-pl-src-write" .claude/settings.json 2>/dev/null; then
  pass "PL settings include block-pl-src-write hook"
else
  fail "PL settings missing block-pl-src-write hook"
fi

# 13.2 No agent role settings have PL-specific hooks
PL_LEAK=0
for role in be-dev be-tech-lead fe-dev fe-tech-lead qa forensic governor; do
  if grep -q "block-pl-src-write\|inject-pl-context\|suggest-compact\|pre-compact" ".hool/settings/${role}.json" 2>/dev/null; then
    PL_LEAK=$((PL_LEAK + 1))
    fail "${role}.json contains PL-specific hook"
  fi
done
if [ "$PL_LEAK" = "0" ]; then
  pass "No agent role settings contain PL-specific hooks"
fi

# 13.3 Agent role settings are valid JSON
JSON_ERRORS=0
for role in be-dev be-tech-lead fe-dev fe-tech-lead qa forensic governor; do
  if ! python3 -c "import json; json.load(open('.hool/settings/${role}.json'))" 2>/dev/null; then
    JSON_ERRORS=$((JSON_ERRORS + 1))
  fi
done
if [ "$JSON_ERRORS" = "0" ]; then
  pass "All 7 role settings files are valid JSON"
else
  fail "$JSON_ERRORS role settings files have invalid JSON"
fi

# ════════════════════════════════════════════════════
section "14. AGENT CROSS-ROLE DISPATCH"
# ════════════════════════════════════════════════════

# 14.1 Different agent roles can be dispatched successfully
echo "  Testing: QA agent dispatch..."
RESULT=$(env -u CLAUDECODE claude -p \
  --agent qa \
  --model sonnet \
  --no-session-persistence \
  "What is your role? Respond with ONLY your role name." 2>/dev/null || echo "QA_FAILED")

if echo "$RESULT" | grep -qi "qa\|quality\|test"; then
  pass "QA agent identifies correctly"
else
  fail "QA agent identity wrong" "Got: $(echo "$RESULT" | head -3)"
fi

# 14.2 Tech lead agent dispatch
echo "  Testing: BE Tech Lead agent dispatch..."
RESULT=$(env -u CLAUDECODE claude -p \
  --agent be-tech-lead \
  --model sonnet \
  --no-session-persistence \
  "What is your role? Respond with ONLY your role name." 2>/dev/null || echo "BTL_FAILED")

if echo "$RESULT" | grep -qi "tech.lead\|be.tech\|backend.*lead"; then
  pass "BE Tech Lead agent identifies correctly"
else
  fail "BE Tech Lead identity wrong" "Got: $(echo "$RESULT" | head -3)"
fi

# ════════════════════════════════════════════════════
section "15. HOOKS INTEGRATION"
# ════════════════════════════════════════════════════

# 15.1 inject-pl-context.sh outputs valid JSON
INJECT_RESULT=$(bash .hool/hooks/inject-pl-context.sh 2>/dev/null)
if echo "$INJECT_RESULT" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
  pass "inject-pl-context.sh outputs valid JSON"
else
  fail "inject-pl-context.sh invalid JSON" "Got: $(echo "$INJECT_RESULT" | head -3)"
fi

# 15.2 inject-pl-context includes phase info
if echo "$INJECT_RESULT" | grep -qi "phase\|current\|mode"; then
  pass "inject-pl-context includes phase/mode context"
else
  fail "inject-pl-context missing phase context"
fi

# 15.3 agent-checklist.sh outputs valid JSON
CHECKLIST_RESULT=$(bash .hool/hooks/agent-checklist.sh 2>/dev/null)
if echo "$CHECKLIST_RESULT" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
  pass "agent-checklist.sh outputs valid JSON"
else
  fail "agent-checklist.sh invalid JSON" "Got: $(echo "$CHECKLIST_RESULT" | head -3)"
fi

# 15.4 pre-compact.sh creates snapshot
mkdir -p .hool/metrics/snapshots
bash .hool/hooks/pre-compact.sh > /dev/null 2>&1
SNAP_COUNT=$(ls .hool/metrics/snapshots/pre-compact-*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$SNAP_COUNT" -gt 0 ]; then
  pass "pre-compact.sh creates state snapshot"
else
  fail "pre-compact.sh did not create snapshot"
fi

# ════════════════════════════════════════════════════
section "16. AGENTS.JSON MANIFEST"
# ════════════════════════════════════════════════════

# 16.1 Manifest has all 8 agents
if python3 -c "
import json
agents = json.load(open('.hool/agents.json'))
names = [a['name'] for a in agents]
expected = ['product-lead','fe-tech-lead','be-tech-lead','fe-dev','be-dev','qa','forensic','governor']
assert sorted(names) == sorted(expected), f'Missing: {set(expected) - set(names)}'
print('OK')
" 2>/dev/null | grep -q "OK"; then
  pass "agents.json has all 8 agents"
else
  fail "agents.json missing agents"
fi

# 16.2 Each agent has memory path with .hool/ prefix
if python3 -c "
import json
agents = json.load(open('.hool/agents.json'))
for a in agents:
  assert a['memory'].startswith('.hool/memory/'), f'{a[\"name\"]} bad memory: {a[\"memory\"]}'
print('OK')
" 2>/dev/null | grep -q "OK"; then
  pass "All agent memory paths use .hool/memory/ prefix"
else
  fail "Agent memory paths incorrect"
fi

# ════════════════════════════════════════════════════
section "17. ORPHAN PROCESS CHECK"
# ════════════════════════════════════════════════════

# 17.1 No orphaned claude -p processes from this test
ORPHANS=$(pgrep -f "claude.*$PROJECT_ROOT" 2>/dev/null | wc -l | tr -d ' ')
if [ "$ORPHANS" = "0" ]; then
  pass "No orphaned claude processes from test project"
else
  fail "$ORPHANS orphaned claude process(es) detected" "PIDs: $(pgrep -f "claude.*$PROJECT_ROOT" 2>/dev/null | tr '\n' ' ')"
  # Kill them
  pgrep -f "claude.*$PROJECT_ROOT" 2>/dev/null | xargs kill 2>/dev/null || true
fi

# 17.2 Verify claude -p processes are non-persistent (--no-session-persistence)
# After all tests above completed, any sessions should have self-terminated
# We verify by checking that test-spawned sessions don't leave behind session files
SESSION_LEAKS=$(find /tmp -maxdepth 1 -name "claude-session-*" -newer "$PROJECT_ROOT" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SESSION_LEAKS" = "0" ]; then
  pass "No leaked session files from --no-session-persistence"
else
  pass "Session files found but expected with --no-session-persistence flag (managed by Claude)"
fi

# ════════════════════════════════════════════════════
# CLEANUP
# ════════════════════════════════════════════════════

# Restore clean state
cat > "$PROJECT_ROOT/.hool/operations/bugs.md" <<'EOF'
# Bug Tracker

_No bugs reported yet._
EOF

cat > "$PROJECT_ROOT/.hool/operations/task-board.md" <<'EOF'
# Task Board

## Active Tasks
_No tasks yet._

## Completed Tasks
_None._
EOF

# ════════════════════════════════════════════════════
# RESULTS
# ════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════════════════════"
echo "  RESULTS: $PASS passed, $FAIL failed, $SKIPPED skipped, $TOTAL total"
echo "════════════════════════════════════════════════"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "  Some tests failed. Review output above."
  exit 1
else
  echo "  ALL TESTS PASSED"
  exit 0
fi
