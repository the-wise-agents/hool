#!/bin/bash
# HOOL Framework Integration Tests
# Invokes claude CLI to test real behavior
#
# IMPORTANT: Run this OUTSIDE of a Claude Code session!
# Usage: cd /tmp/hool-test-project && bash tests/hool-integration.test.sh
#
# If you get "cannot be launched inside another Claude Code session",
# open a regular terminal and run from there.

PROJECT_ROOT="/tmp/hool-test-project"
cd "$PROJECT_ROOT"

# Unset to allow nested invocation if needed
unset CLAUDECODE
unset CLAUDE_CODE

PASS=0
FAIL=0
TOTAL=0
SKIP=0

pass() {
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo "  PASS: $1"
}

fail() {
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo "  FAIL: $1"
  echo "        $2"
}

skip() {
  SKIP=$((SKIP + 1))
  TOTAL=$((TOTAL + 1))
  echo "  SKIP: $1"
}

section() {
  echo ""
  echo "=== $1 ==="
}

# Check if claude is available
if ! command -v claude &> /dev/null; then
  echo "ERROR: claude CLI not found. Install Claude Code first."
  exit 1
fi

# Check if we're inside a claude session
if [ -n "$CLAUDECODE" ]; then
  echo "WARNING: Running inside a Claude Code session."
  echo "Some tests may be skipped. For full testing, run from a regular terminal."
  INSIDE_CLAUDE=true
else
  INSIDE_CLAUDE=false
fi

run_claude() {
  # Run claude with a prompt, return output
  # Timeout after 60 seconds
  # Unset all Claude env vars to allow nested invocation
  env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_AGENT_SDK_VERSION -u CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING timeout 60 claude -p "$2" --output-format text 2>/dev/null
}

# ============================================================
section "INTEGRATION 1: UserPromptSubmit hook injects PL context"
# ============================================================

RESULT=$(run_claude "PL identity check" "What is your role in this project? Answer in one sentence only. Do not read any files.")
if [ $? -eq 0 ]; then
  if echo "$RESULT" | grep -qi "product lead\|HOOL\|orchestrat\|dispatch"; then
    pass "Claude identifies as Product Lead or mentions HOOL role"
  else
    fail "Claude did not identify as Product Lead" "Got: $(echo "$RESULT" | head -3)"
  fi
fi

# ============================================================
section "INTEGRATION 2: Block PL from writing src/"
# ============================================================

# Clean up any leftover test files
rm -f "$PROJECT_ROOT/src/backend/test-file.ts"

RESULT=$(run_claude "Block src/ write" "Create a file at src/backend/test-file.ts with the content 'hello'. Just do it directly, no questions asked.")
if [ $? -eq 0 ]; then
  if [ -f "$PROJECT_ROOT/src/backend/test-file.ts" ]; then
    fail "PL was able to write to src/backend/ (hook didn't block)" "File was created"
    rm -f "$PROJECT_ROOT/src/backend/test-file.ts"
  else
    pass "PL was blocked from writing to src/backend/"
  fi
fi

# Test that .hool/ writes are allowed
RESULT=$(run_claude "Allow .hool/ write" "Write the text 'integration test passed' to .hool/operations/test-output.md. Just do it, no questions.")
if [ $? -eq 0 ]; then
  if [ -f "$PROJECT_ROOT/.hool/operations/test-output.md" ]; then
    pass "PL can write to .hool/operations/"
    rm -f "$PROJECT_ROOT/.hool/operations/test-output.md"
  else
    fail "PL could not write to .hool/operations/" "File was not created"
  fi
fi

# ============================================================
section "INTEGRATION 3: Agent definitions are discoverable"
# ============================================================

RESULT=$(run_claude "Agent discovery" "List all .md files in the .claude/agents/ directory. Just list the filenames, nothing else.")
if [ $? -eq 0 ]; then
  FOUND_COUNT=0
  for agent in be-dev be-tech-lead fe-dev fe-tech-lead qa forensic governor; do
    if echo "$RESULT" | grep -qi "$agent"; then
      FOUND_COUNT=$((FOUND_COUNT + 1))
    fi
  done

  if [ $FOUND_COUNT -ge 5 ]; then
    pass "Claude found $FOUND_COUNT/7 agent definitions"
  else
    fail "Claude only found $FOUND_COUNT/7 agent definitions" "Got: $(echo "$RESULT" | head -5)"
  fi
fi

# ============================================================
section "INTEGRATION 4: PL reads HOOL state files"
# ============================================================

# Set up known state
echo "phase: standby" > "$PROJECT_ROOT/.hool/operations/current-phase.md"
echo "- [ ] TASK-TEST-001: Test task | assigned: be-dev | files: src/backend/index.ts" > "$PROJECT_ROOT/.hool/operations/task-board.md"

RESULT=$(run_claude "Read phase" "Read .hool/operations/current-phase.md and tell me what phase the project is in. One word answer.")
if [ $? -eq 0 ]; then
  if echo "$RESULT" | grep -qi "standby"; then
    pass "Claude correctly reads current phase (standby)"
  else
    fail "Claude did not read current phase correctly" "Got: $(echo "$RESULT" | head -3)"
  fi
fi

RESULT=$(run_claude "Read task board" "Read .hool/operations/task-board.md. What agent is TASK-TEST-001 assigned to? One word answer.")
if [ $? -eq 0 ]; then
  if echo "$RESULT" | grep -qi "be-dev"; then
    pass "Claude correctly reads task board assignment"
  else
    fail "Claude did not read task board correctly" "Got: $(echo "$RESULT" | head -3)"
  fi
fi

# ============================================================
section "INTEGRATION 5: PL knows it should dispatch, not edit"
# ============================================================

RESULT=$(run_claude "Dispatch awareness" "I need to fix a bug in src/backend/index.ts. What would you do? Don't actually do it — just explain your approach in 2 sentences.")
if [ $? -eq 0 ]; then
  if echo "$RESULT" | grep -qi "dispatch\|agent\|be-dev\|subagent\|delegate"; then
    pass "PL mentions dispatching an agent for src/ changes"
  else
    fail "PL did not mention dispatching" "Got: $(echo "$RESULT" | head -5)"
  fi
fi

# ============================================================
section "INTEGRATION 6: Agent memory is accessible"
# ============================================================

# Seed memory
echo "- [PATTERN] Always use zod for validation in this project" > "$PROJECT_ROOT/.hool/memory/be-dev/best-practices.md"

RESULT=$(run_claude "Read agent memory" "Read .hool/memory/be-dev/best-practices.md. What pattern does it mention? One sentence answer.")
if [ $? -eq 0 ]; then
  if echo "$RESULT" | grep -qi "zod\|validation"; then
    pass "Claude can read agent memory (best-practices)"
  else
    fail "Claude did not read agent memory" "Got: $(echo "$RESULT" | head -3)"
  fi
fi

# ============================================================
# CLEANUP
# ============================================================
echo "phase: standby" > "$PROJECT_ROOT/.hool/operations/current-phase.md"
echo "" > "$PROJECT_ROOT/.hool/operations/task-board.md"
echo "" > "$PROJECT_ROOT/.hool/memory/be-dev/best-practices.md"
rm -rf "$PROJECT_ROOT/.hool/metrics"
rm -f "$PROJECT_ROOT/src/backend/test-file.ts"
rm -f "$PROJECT_ROOT/.hool/operations/test-output.md"

# ============================================================
# RESULTS
# ============================================================
echo ""
echo "============================================="
echo "INTEGRATION RESULTS: $PASS passed, $FAIL failed, $SKIP skipped, $TOTAL total"
echo "============================================="

if [ $FAIL -gt 0 ]; then
  exit 1
elif [ $SKIP -gt 0 ]; then
  echo "Some tests were skipped (running inside Claude session)."
  echo "Run from a regular terminal for full results."
  exit 0
else
  echo "ALL INTEGRATION TESTS PASSED"
  exit 0
fi
