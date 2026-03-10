#!/bin/bash
# HOOL Framework Tests — validates scaffolded project structure
# Run: cd /tmp/hool-test-project && bash tests/hool-framework.test.sh

PROJECT_ROOT="/tmp/hool-test-project"
cd "$PROJECT_ROOT"

PASS=0
FAIL=0
TOTAL=0

pass() {
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo "  PASS: $1"
}

fail() {
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo "  FAIL: $1"
  [ -n "$2" ] && echo "        $2"
}

section() {
  echo ""
  echo "=== $1 ==="
}

# ============================================================
section "1. FILE STRUCTURE — .hool/ directory"
# ============================================================

# 1.1 Core directories
for dir in .hool/operations .hool/memory .hool/phases .hool/hooks .hool/prompts .hool/logs .hool/metrics; do
  if [ -d "$dir" ]; then
    pass "$dir exists"
  else
    fail "$dir missing"
  fi
done

# 1.2 Phase directories
for dir in .hool/phases/00-init .hool/phases/01-brainstorm .hool/phases/02-spec/features .hool/phases/03-design/cards .hool/phases/03-design/flows .hool/phases/04-architecture/contracts .hool/phases/04-architecture/flows .hool/phases/04-architecture/fe .hool/phases/04-architecture/be .hool/phases/05-fe-scaffold/pages .hool/phases/06-be-scaffold/services .hool/phases/07-test-plan/cases; do
  if [ -d "$dir" ]; then
    pass "$dir exists"
  else
    fail "$dir missing"
  fi
done

# 1.3 Operations files
for f in current-phase.md task-board.md bugs.md issues.md inconsistencies.md needs-human-review.md client-preferences.md governor-rules.md governor-log.md; do
  if [ -f ".hool/operations/$f" ]; then
    pass ".hool/operations/$f exists"
  else
    fail ".hool/operations/$f missing"
  fi
done

# 1.4 Operations subdirs
for dir in .hool/operations/context .hool/operations/dispatch; do
  if [ -d "$dir" ]; then
    pass "$dir exists"
  else
    fail "$dir missing"
  fi
done

# 1.5 Memory directories (all 8 agents)
for agent in product-lead fe-tech-lead be-tech-lead fe-dev be-dev qa forensic governor; do
  if [ -d ".hool/memory/$agent" ]; then
    pass ".hool/memory/$agent exists"
  else
    fail ".hool/memory/$agent missing"
  fi
  for f in hot.md cold.md best-practices.md issues.md governor-feedback.md; do
    if [ -f ".hool/memory/$agent/$f" ]; then
      pass ".hool/memory/$agent/$f exists"
    else
      fail ".hool/memory/$agent/$f missing"
    fi
  done
done

# 1.6 Project profile
if [ -f ".hool/phases/00-init/project-profile.md" ]; then
  pass "project-profile.md exists"
  if grep -q "web-app" .hool/phases/00-init/project-profile.md; then
    pass "project-profile.md has correct type"
  else
    fail "project-profile.md missing type" "$(head -3 .hool/phases/00-init/project-profile.md)"
  fi
else
  fail "project-profile.md missing"
fi

# 1.7 Prompts copied
if [ -f ".hool/prompts/orchestrator.md" ]; then
  pass "orchestrator.md copied"
else
  fail "orchestrator.md missing"
fi

for agent in 05-fe-tech-lead 06-be-tech-lead 08-be-dev 08-fe-dev 10-qa 11-forensic governor; do
  if [ -f ".hool/prompts/agents/$agent.md" ]; then
    pass ".hool/prompts/agents/$agent.md copied"
  else
    fail ".hool/prompts/agents/$agent.md missing"
  fi
done

# 1.8 Manifests
if [ -f ".hool/agents.json" ]; then
  pass "agents.json exists"
else
  fail "agents.json missing"
fi

if [ -f ".hool/mcps.json" ]; then
  pass "mcps.json exists"
else
  fail "mcps.json missing"
fi

# ============================================================
section "2. CLAUDE CODE AGENT DEFINITIONS"
# ============================================================

# 2.1 All 7 agent files exist
for agent in be-dev be-tech-lead fe-dev fe-tech-lead qa forensic governor; do
  if [ -f ".claude/agents/$agent.md" ]; then
    pass ".claude/agents/$agent.md exists"
  else
    fail ".claude/agents/$agent.md missing"
  fi
done

# 2.2 Agent frontmatter validation
for agent in be-dev be-tech-lead fe-dev fe-tech-lead qa forensic governor; do
  FILE=".claude/agents/$agent.md"
  if head -1 "$FILE" | grep -q "^---"; then
    pass "$agent has YAML frontmatter"
  else
    fail "$agent missing YAML frontmatter"
  fi
  if grep -q "^name:" "$FILE"; then
    pass "$agent has name field"
  else
    fail "$agent missing name field"
  fi
  if grep -q "^description:" "$FILE"; then
    pass "$agent has description field"
  else
    fail "$agent missing description field"
  fi
  if grep -q "^tools:" "$FILE"; then
    pass "$agent has tools field"
  else
    fail "$agent missing tools field"
  fi
done

# 2.3 Tool restrictions — devs should NOT have Agent tool
for agent in be-dev fe-dev; do
  if grep "^tools:" ".claude/agents/$agent.md" | grep -q "Agent"; then
    fail "$agent has Agent tool (should not)" "$(grep '^tools:' .claude/agents/$agent.md)"
  else
    pass "$agent correctly lacks Agent tool"
  fi
done

# 2.4 Tech leads SHOULD have Agent tool
for agent in be-tech-lead fe-tech-lead; do
  if grep "^tools:" ".claude/agents/$agent.md" | grep -q "Agent"; then
    pass "$agent has Agent tool"
  else
    fail "$agent missing Agent tool"
  fi
done

# 2.5 Forensic should be read-only (no Edit/Write)
if grep "^tools:" ".claude/agents/forensic.md" | grep -qE "Edit|Write"; then
  fail "forensic has Edit/Write tools (should not)"
else
  pass "forensic correctly read-only (no Edit/Write)"
fi

# 2.6 All agents reference .hool/ paths
for agent in be-dev be-tech-lead fe-dev fe-tech-lead qa forensic governor; do
  if grep -q '\.hool/' ".claude/agents/$agent.md"; then
    pass "$agent references .hool/ paths"
  else
    fail "$agent missing .hool/ path references"
  fi
done

# 2.7 All agents have Boot Sequence
for agent in be-dev be-tech-lead fe-dev fe-tech-lead qa forensic governor; do
  if grep -q "Boot Sequence" ".claude/agents/$agent.md"; then
    pass "$agent has Boot Sequence"
  else
    fail "$agent missing Boot Sequence"
  fi
done

# ============================================================
section "3. HOOKS"
# ============================================================

# 3.1 Hook files exist and are executable
for hook in block-pl-src-write.sh track-prompt-count.sh inject-pl-context.sh agent-checklist.sh; do
  if [ -f ".hool/hooks/$hook" ]; then
    pass "$hook exists"
    if [ -x ".hool/hooks/$hook" ]; then
      pass "$hook is executable"
    else
      fail "$hook not executable"
    fi
  else
    fail "$hook missing"
  fi
done

# 3.2 block-pl-src-write.sh blocks src/ writes
echo '{"tool_name":"Write","tool_input":{"file_path":"src/backend/index.ts","content":"test"}}' | bash .hool/hooks/block-pl-src-write.sh > /dev/null 2>&1
if [ $? -eq 2 ]; then
  pass "block-pl-src-write.sh blocks src/ write (exit 2)"
else
  fail "block-pl-src-write.sh did not block src/ write"
fi

# 3.3 block-pl-src-write.sh allows .hool/ writes
echo '{"tool_name":"Write","tool_input":{"file_path":".hool/operations/task-board.md","content":"test"}}' | bash .hool/hooks/block-pl-src-write.sh > /dev/null 2>&1
if [ $? -eq 0 ]; then
  pass "block-pl-src-write.sh allows .hool/ write (exit 0)"
else
  fail "block-pl-src-write.sh blocked .hool/ write incorrectly"
fi

# 3.4 block-pl-src-write.sh blocks tests/ writes
echo '{"tool_name":"Write","tool_input":{"file_path":"tests/unit/test.ts","content":"test"}}' | bash .hool/hooks/block-pl-src-write.sh > /dev/null 2>&1
if [ $? -eq 2 ]; then
  pass "block-pl-src-write.sh blocks tests/ write (exit 2)"
else
  fail "block-pl-src-write.sh did not block tests/ write"
fi

# 3.5 track-prompt-count.sh increments dispatch counter
rm -f .hool/metrics/dispatch-count.txt
echo '{"tool_name":"Agent","tool_input":{}}' | bash .hool/hooks/track-prompt-count.sh > /dev/null 2>&1
COUNT=$(cat .hool/metrics/dispatch-count.txt 2>/dev/null)
if [ "$COUNT" = "1" ]; then
  pass "track-prompt-count.sh increments to 1"
else
  fail "track-prompt-count.sh count wrong" "Expected 1, got: $COUNT"
fi

# 3.6 track-prompt-count.sh triggers governor at 3
echo '{"tool_name":"Agent","tool_input":{}}' | bash .hool/hooks/track-prompt-count.sh > /dev/null 2>&1
RESULT=$(echo '{"tool_name":"Agent","tool_input":{}}' | bash .hool/hooks/track-prompt-count.sh 2>/dev/null)
COUNT=$(cat .hool/metrics/dispatch-count.txt 2>/dev/null)
if [ "$COUNT" = "3" ]; then
  pass "track-prompt-count.sh increments to 3"
else
  fail "track-prompt-count.sh count wrong at 3" "Expected 3, got: $COUNT"
fi
if echo "$RESULT" | grep -q "GOVERNOR CHECK"; then
  pass "track-prompt-count.sh triggers governor at 3"
else
  fail "track-prompt-count.sh did not trigger governor at 3" "Got: $RESULT"
fi

# 3.7 inject-pl-context.sh outputs valid JSON
RESULT=$(bash .hool/hooks/inject-pl-context.sh 2>/dev/null)
if echo "$RESULT" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
  pass "inject-pl-context.sh outputs valid JSON"
else
  fail "inject-pl-context.sh invalid JSON" "Got: $RESULT"
fi

# 3.8 inject-pl-context.sh includes PL context
if echo "$RESULT" | grep -q "HOOL PRODUCT LEAD CONTEXT"; then
  pass "inject-pl-context.sh includes PL context"
else
  fail "inject-pl-context.sh missing PL context"
fi

# 3.9 New hooks exist and are executable
for hook in pre-compact.sh suggest-compact.sh session-start.sh run-if-profile.sh; do
  if [ -f ".hool/hooks/$hook" ]; then
    pass "$hook exists"
    if [ -x ".hool/hooks/$hook" ]; then
      pass "$hook is executable"
    else
      fail "$hook not executable"
    fi
  else
    fail "$hook missing"
  fi
done

# 3.10 pre-compact.sh creates snapshot and outputs JSON
mkdir -p .hool/metrics/snapshots
RESULT=$(bash .hool/hooks/pre-compact.sh 2>/dev/null)
if echo "$RESULT" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
  pass "pre-compact.sh outputs valid JSON"
else
  fail "pre-compact.sh invalid JSON" "Got: $RESULT"
fi
if echo "$RESULT" | grep -q "HOOL STATE SNAPSHOT"; then
  pass "pre-compact.sh includes state snapshot context"
else
  fail "pre-compact.sh missing state snapshot context"
fi
# Check snapshot file was created
SNAP_COUNT=$(ls .hool/metrics/snapshots/pre-compact-*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$SNAP_COUNT" -gt 0 ]; then
  pass "pre-compact.sh creates snapshot file"
else
  fail "pre-compact.sh did not create snapshot file"
fi

# 3.11 suggest-compact.sh tracks tool calls
rm -f .hool/metrics/tool-call-count.txt
bash .hool/hooks/suggest-compact.sh > /dev/null 2>&1
COUNT=$(cat .hool/metrics/tool-call-count.txt 2>/dev/null | tr -d '\n')
if [ "$COUNT" = "1" ]; then
  pass "suggest-compact.sh increments tool call count"
else
  fail "suggest-compact.sh count wrong" "Expected 1, got: $COUNT"
fi

# 3.12 agent-checklist.sh outputs valid JSON (upgraded from plain text)
RESULT=$(bash .hool/hooks/agent-checklist.sh 2>/dev/null)
if echo "$RESULT" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
  pass "agent-checklist.sh outputs valid JSON"
else
  fail "agent-checklist.sh invalid JSON" "Got: $RESULT"
fi
if echo "$RESULT" | grep -q "OPERATIONAL CHECKLIST"; then
  pass "agent-checklist.sh includes checklist in JSON"
else
  fail "agent-checklist.sh missing checklist in JSON"
fi

# 3.13 inject-pl-context.sh includes phase-specific guidance
if echo "$RESULT" | grep -q "additionalContext"; then
  pass "agent-checklist.sh uses additionalContext field"
else
  fail "agent-checklist.sh missing additionalContext field"
fi

# 3.14 run-if-profile.sh passes through when profile doesn't match
RESULT=$(echo "passthrough-test" | HOOL_HOOK_PROFILE=minimal bash .hool/hooks/run-if-profile.sh "strict" "echo should-not-run" 2>/dev/null)
if [ "$RESULT" = "passthrough-test" ]; then
  pass "run-if-profile.sh passes through on profile mismatch"
else
  fail "run-if-profile.sh did not pass through" "Got: $RESULT"
fi

# 3.15 settings.json includes PreCompact hook
if grep -q "PreCompact" .claude/settings.json 2>/dev/null; then
  pass "settings.json has PreCompact hook"
else
  fail "settings.json missing PreCompact hook"
fi

# 3.16 settings.json includes suggest-compact hook
if grep -q "suggest-compact" .claude/settings.json 2>/dev/null; then
  pass "settings.json has suggest-compact hook"
else
  fail "settings.json missing suggest-compact hook"
fi

# 3.17 settings.json has description fields on hooks
DESC_COUNT=$(grep -c '"description"' .claude/settings.json 2>/dev/null | tr -d '\n' || echo "0")
if [ "$DESC_COUNT" -ge 5 ]; then
  pass "settings.json has descriptions on hooks ($DESC_COUNT)"
else
  fail "settings.json missing hook descriptions" "Expected >=5, got: $DESC_COUNT"
fi

# ============================================================
section "4. SETTINGS.JSON"
# ============================================================

if [ -f ".claude/settings.json" ]; then
  pass ".claude/settings.json exists"
else
  fail ".claude/settings.json missing"
fi

# 4.1 Valid JSON
if python3 -c "import json; json.load(open('.claude/settings.json'))" 2>/dev/null; then
  pass "settings.json is valid JSON"
else
  fail "settings.json is invalid JSON"
fi

# 4.2 All hook events configured
for event in PreToolUse PostToolUse UserPromptSubmit PreCompact Stop SubagentStop; do
  if grep -q "$event" .claude/settings.json; then
    pass "$event hook configured"
  else
    fail "$event hook missing"
  fi
done

# 4.3 All hook commands reference .hool/hooks/
HOOK_PATHS=$(grep '"command":' .claude/settings.json | grep -v ".hool/hooks/" | grep -v '"type"' || true)
if [ -z "$HOOK_PATHS" ]; then
  pass "All hook commands reference .hool/hooks/"
else
  fail "Some hook commands don't reference .hool/hooks/" "$HOOK_PATHS"
fi

# ============================================================
section "5. CLAUDE.MD"
# ============================================================

if [ -f "CLAUDE.md" ]; then
  pass "CLAUDE.md exists"
else
  fail "CLAUDE.md missing"
fi

# 5.1 Has HOOL markers
if grep -q "HOOL:START" CLAUDE.md; then
  pass "CLAUDE.md has HOOL:START marker"
else
  fail "CLAUDE.md missing HOOL:START marker"
fi

if grep -q "HOOL:END" CLAUDE.md; then
  pass "CLAUDE.md has HOOL:END marker"
else
  fail "CLAUDE.md missing HOOL:END marker"
fi

# 5.2 References .hool/ paths
if grep -q '\.hool/operations/current-phase\.md' CLAUDE.md; then
  pass "CLAUDE.md references .hool/operations/"
else
  fail "CLAUDE.md missing .hool/operations/ references"
fi

if grep -q '\.hool/memory/' CLAUDE.md; then
  pass "CLAUDE.md references .hool/memory/"
else
  fail "CLAUDE.md missing .hool/memory/ references"
fi

# 5.3 References .claude/agents/ for dispatch
if grep -q '\.claude/agents/' CLAUDE.md; then
  pass "CLAUDE.md references .claude/agents/ for dispatch"
else
  fail "CLAUDE.md missing .claude/agents/ dispatch reference"
fi

# ============================================================
section "6. PATH CONSISTENCY — no bare operations/, memory/, phases/"
# ============================================================

# Check that orchestrator.md uses .hool/ prefix consistently
BARE_OPS=$(grep -c '`operations/' .hool/prompts/orchestrator.md 2>/dev/null | tr -d '\n' || echo "0")
HOOL_OPS=$(grep -c '\.hool/operations/' .hool/prompts/orchestrator.md 2>/dev/null | tr -d '\n' || echo "0")
if [ "$BARE_OPS" -eq 0 ] && [ "$HOOL_OPS" -gt 0 ]; then
  pass "orchestrator.md: no bare operations/ paths ($HOOL_OPS .hool/ refs)"
else
  fail "orchestrator.md has $BARE_OPS bare operations/ paths"
fi

BARE_MEM=$(grep -c '`memory/' .hool/prompts/orchestrator.md 2>/dev/null | tr -d '\n' || echo "0")
HOOL_MEM=$(grep -c '\.hool/memory/' .hool/prompts/orchestrator.md 2>/dev/null | tr -d '\n' || echo "0")
if [ "$BARE_MEM" -eq 0 ] && [ "$HOOL_MEM" -gt 0 ]; then
  pass "orchestrator.md: no bare memory/ paths ($HOOL_MEM .hool/ refs)"
else
  fail "orchestrator.md has $BARE_MEM bare memory/ paths"
fi

# Check agent definitions use .hool/ paths
for agent in be-dev be-tech-lead fe-dev fe-tech-lead qa forensic governor; do
  BARE=$(grep -cE '`(operations|memory|phases)/' ".claude/agents/$agent.md" 2>/dev/null || echo "0")
  HOOL=$(grep -c '\.hool/' ".claude/agents/$agent.md" 2>/dev/null || echo "0")
  if [ "$HOOL" -gt 0 ]; then
    pass "$agent agent def uses .hool/ paths ($HOOL refs)"
  else
    fail "$agent agent def missing .hool/ paths"
  fi
done

# Check agents.json uses .hool/ paths for memory
if grep -q '\.hool/memory/' .hool/agents.json; then
  pass "agents.json uses .hool/memory/ paths"
else
  fail "agents.json has bare memory/ paths"
fi

# ============================================================
section "7. AGENTS.JSON MANIFEST"
# ============================================================

if python3 -c "import json; json.load(open('.hool/agents.json'))" 2>/dev/null; then
  pass "agents.json is valid JSON"
else
  fail "agents.json is invalid JSON"
fi

# 7.1 All agents present
for agent in product-lead fe-tech-lead be-tech-lead fe-dev be-dev qa forensic governor; do
  if grep -q "\"$agent\"" .hool/agents.json; then
    pass "agents.json has $agent"
  else
    fail "agents.json missing $agent"
  fi
done

# 7.2 Agent definitions reference .claude/agents/
for agent in fe-tech-lead be-tech-lead fe-dev be-dev qa forensic governor; do
  if grep -q "\.claude/agents/$agent\.md" .hool/agents.json; then
    pass "agents.json $agent -> .claude/agents/$agent.md"
  else
    fail "agents.json $agent missing .claude/agents/ reference"
  fi
done

# ============================================================
section "8. NO OLD ROOT-LEVEL DIRS"
# ============================================================

for dir in operations memory phases; do
  if [ -d "$PROJECT_ROOT/$dir" ]; then
    fail "Old root-level $dir/ still exists (should be under .hool/)"
  else
    pass "No root-level $dir/ (correctly under .hool/)"
  fi
done

# ============================================================
section "9. V0.6 FEATURES"
# ============================================================

# 9.1 Progressive workflow in orchestrator
if grep -q "Complexity Classification" "$PROJECT_ROOT/.hool/prompts/orchestrator.md" 2>/dev/null; then
  pass "Orchestrator has complexity classification section"
else
  fail "Orchestrator missing complexity classification"
fi

for tier in "Trivial" "Small" "Medium" "Large"; do
  if grep -q "$tier" "$PROJECT_ROOT/.hool/prompts/orchestrator.md" 2>/dev/null; then
    pass "Orchestrator has $tier complexity tier"
  else
    fail "Orchestrator missing $tier complexity tier"
  fi
done

# 9.2 Ship flow in orchestrator
if grep -q "Ship Flow" "$PROJECT_ROOT/.hool/prompts/orchestrator.md" 2>/dev/null; then
  pass "Orchestrator has ship flow section"
else
  fail "Orchestrator missing ship flow"
fi

# 9.3 Nudge system in orchestrator
if grep -q "Nudge System" "$PROJECT_ROOT/.hool/prompts/orchestrator.md" 2>/dev/null; then
  pass "Orchestrator has nudge system section"
else
  fail "Orchestrator missing nudge system"
fi

if grep -q "Interactive Mode Nudges" "$PROJECT_ROOT/.hool/prompts/orchestrator.md" 2>/dev/null; then
  pass "Orchestrator has interactive mode nudges"
else
  fail "Orchestrator missing interactive mode nudges"
fi

if grep -q "Full-HOOL Mode Nudges" "$PROJECT_ROOT/.hool/prompts/orchestrator.md" 2>/dev/null; then
  pass "Orchestrator has full-hool mode nudges"
else
  fail "Orchestrator missing full-hool mode nudges"
fi

# 9.4 TDD enforcement in dev prompts
for agent in "08-fe-dev" "08-be-dev"; do
  if grep -q "Test Execution Requirement" "$PROJECT_ROOT/.hool/prompts/agents/${agent}.md" 2>/dev/null; then
    pass "$agent has test execution requirement"
  else
    fail "$agent missing test execution requirement"
  fi
  if grep -qi "paste the actual terminal output" "$PROJECT_ROOT/.hool/prompts/agents/${agent}.md" 2>/dev/null; then
    pass "$agent requires pasted terminal output"
  else
    fail "$agent missing paste terminal output requirement"
  fi
done

# 9.5 TDD enforcement in QA prompt
if grep -q "MANDATORY.*paste actual output" "$PROJECT_ROOT/.hool/prompts/agents/10-qa.md" 2>/dev/null; then
  pass "QA has mandatory test execution with pasted output"
else
  fail "QA missing mandatory test execution requirement"
fi

# 9.6 TDD governor rule
if grep -q "MUST run actual test commands" "$PROJECT_ROOT/.hool/operations/governor-rules.md" 2>/dev/null; then
  pass "Governor rules include TDD enforcement"
else
  fail "Governor rules missing TDD enforcement"
fi

# 9.7 Governor cross-agent pattern detection
if grep -q "Cross-agent pattern detection" "$PROJECT_ROOT/.hool/prompts/agents/governor.md" 2>/dev/null; then
  pass "Governor has cross-agent pattern detection"
else
  fail "Governor missing cross-agent pattern detection"
fi

if grep -q "CROSS-AGENT" "$PROJECT_ROOT/.hool/prompts/agents/governor.md" 2>/dev/null; then
  pass "Governor has CROSS-AGENT tag"
else
  fail "Governor missing CROSS-AGENT tag"
fi

# 9.8 Governor re-dispatch in orchestrator
if grep -q "Immediately re-dispatch the violating agent" "$PROJECT_ROOT/.hool/prompts/orchestrator.md" 2>/dev/null; then
  pass "Orchestrator has governor re-dispatch directive"
else
  fail "Orchestrator missing governor re-dispatch"
fi

# 9.9 Baseline review checklist
if [ -f "$PROJECT_ROOT/.hool/prompts/checklists/code-review.md" ]; then
  pass "Code review checklist exists"
else
  fail "Code review checklist missing"
fi

for category in "Security" "API Design" "Performance" "Accessibility" "Code Quality"; do
  if grep -q "## $category" "$PROJECT_ROOT/.hool/prompts/checklists/code-review.md" 2>/dev/null; then
    pass "Checklist has $category section"
  else
    fail "Checklist missing $category section"
  fi
done

# 9.10 Checklist wired into Tech Lead prompts
for agent in "05-fe-tech-lead" "06-be-tech-lead"; do
  if grep -q "code-review.md" "$PROJECT_ROOT/.hool/prompts/agents/${agent}.md" 2>/dev/null; then
    pass "$agent references code-review checklist"
  else
    fail "$agent missing code-review checklist reference"
  fi
done

# 9.11 QA scoring rubric
if grep -q "QA Scoring Rubric" "$PROJECT_ROOT/.hool/prompts/agents/10-qa.md" 2>/dev/null; then
  pass "QA has scoring rubric"
else
  fail "QA missing scoring rubric"
fi

for category in "Functional correctness" "Test coverage" "Edge cases" "Visual fidelity" "Exploratory findings"; do
  if grep -q "$category" "$PROJECT_ROOT/.hool/prompts/agents/10-qa.md" 2>/dev/null; then
    pass "QA rubric has $category"
  else
    fail "QA rubric missing $category"
  fi
done

if grep -q "QA-SCORE" "$PROJECT_ROOT/.hool/prompts/agents/10-qa.md" 2>/dev/null; then
  pass "QA has QA-SCORE work log tag"
else
  fail "QA missing QA-SCORE tag"
fi

# 9.12 inject-pl-context.sh has nudge data
HOOK_SOURCE=".hool/hooks/inject-pl-context.sh"
if grep -q "NUDGE" "$HOOK_SOURCE" 2>/dev/null; then
  pass "inject-pl-context.sh has nudge logic"
else
  fail "inject-pl-context.sh missing nudge logic"
fi

if grep -q "MODE=" "$HOOK_SOURCE" 2>/dev/null; then
  pass "inject-pl-context.sh detects execution mode"
else
  fail "inject-pl-context.sh missing mode detection"
fi

if grep -q "PROGRESS" "$HOOK_SOURCE" 2>/dev/null; then
  pass "inject-pl-context.sh has progress tracking"
else
  fail "inject-pl-context.sh missing progress tracking"
fi

if grep -q "Classify request complexity" "$HOOK_SOURCE" 2>/dev/null; then
  pass "inject-pl-context.sh includes complexity classification rule"
else
  fail "inject-pl-context.sh missing complexity classification rule"
fi

# ============================================================
# 10. HOOL STATUS CLI
# ============================================================
section "10. hool status CLI"

# Resolve CLI path (relative to the test project's parent)
HOOL_CLI="$(cd /Users/apple/Documents/personal\ projects/hool && pwd)/cli/dist/index.js"

# 10.1 hool status runs without error
STATUS_OUTPUT=$(node "$HOOL_CLI" status -d "$PROJECT_ROOT" 2>&1)
if [ $? -eq 0 ]; then
  pass "hool status exits cleanly"
else
  fail "hool status failed" "$STATUS_OUTPUT"
fi

# 10.2 Shows phase info
if echo "$STATUS_OUTPUT" | grep -q "Phase"; then
  pass "hool status shows phase info"
else
  fail "hool status missing phase info"
fi

# 10.3 Shows progress bar (░ or █ characters)
if echo "$STATUS_OUTPUT" | grep -qE '[█░]'; then
  pass "hool status shows progress bar"
else
  fail "hool status missing progress bar"
fi

# 10.4 Shows task counts
if echo "$STATUS_OUTPUT" | grep -qE '[0-9]+/[0-9]+'; then
  pass "hool status shows task counts (X/Y format)"
else
  fail "hool status missing task counts"
fi

# 10.5 Shows pending/completed counts
if echo "$STATUS_OUTPUT" | grep -q "Pending:"; then
  pass "hool status shows pending count"
else
  fail "hool status missing pending count"
fi

# 10.6 Shows bug section
if echo "$STATUS_OUTPUT" | grep -qi "bug"; then
  pass "hool status shows bug section"
else
  fail "hool status missing bug section"
fi

# 10.7 Shows human review section
if echo "$STATUS_OUTPUT" | grep -qi "Human Review"; then
  pass "hool status shows human review section"
else
  fail "hool status missing human review section"
fi

# 10.8 Agent progress shown when tasks have assigned agents
# The scaffolded task-board has assigned agents (product-lead for onboard tasks, or none for fresh)
if echo "$STATUS_OUTPUT" | grep -qE "(Agent Progress|No bugs|Pending:)"; then
  pass "hool status renders without crash on scaffolded project"
else
  fail "hool status output looks incomplete"
fi

# 10.9 Test with known bug entries
cat > "$PROJECT_ROOT/.hool/operations/bugs.md" << 'BUGEOF'
# Bug Tracker

## BUG-001: Login button unresponsive
- Status: open

## BUG-002: CSS misalignment on mobile
- Status: open

## BUG-003: Fixed crash on submit
- Status: resolved
BUGEOF

STATUS_WITH_BUGS=$(node "$HOOL_CLI" status -d "$PROJECT_ROOT" 2>&1)
if echo "$STATUS_WITH_BUGS" | grep -q "Open:"; then
  pass "hool status shows open bug count when bugs exist"
else
  fail "hool status missing open bug count with bugs"
fi

# 10.10 Test with dispatch count (governor audit tracking)
mkdir -p "$PROJECT_ROOT/.hool/metrics"
echo "5" > "$PROJECT_ROOT/.hool/metrics/dispatch-count.txt"
STATUS_WITH_GOV=$(node "$HOOL_CLI" status -d "$PROJECT_ROOT" 2>&1)
if echo "$STATUS_WITH_GOV" | grep -q "Dispatches:"; then
  pass "hool status shows governor dispatch count"
else
  fail "hool status missing governor dispatch count"
fi

if echo "$STATUS_WITH_GOV" | grep -q "audit"; then
  pass "hool status shows audit-due indicator"
else
  fail "hool status missing audit-due indicator"
fi

# 10.11 Test with inconsistencies
cat > "$PROJECT_ROOT/.hool/operations/inconsistencies.md" << 'INCEOF'
# Inconsistencies

- INC-001: spec says email required, contract says optional
- INC-002: schema missing index on users.email
INCEOF

STATUS_WITH_INC=$(node "$HOOL_CLI" status -d "$PROJECT_ROOT" 2>&1)
if echo "$STATUS_WITH_INC" | grep -qi "inconsistenc"; then
  pass "hool status shows inconsistencies when present"
else
  fail "hool status missing inconsistencies section"
fi

# 10.12 Per-agent progress with known task board
cat > "$PROJECT_ROOT/.hool/operations/task-board.md" << 'TBEOF'
# Task Board

## Active Tasks
- [ ] TASK-001: implement login | assigned: be-dev | files: src/backend/auth
- [ ] TASK-002: implement signup | assigned: be-dev | files: src/backend/auth
- [x] TASK-003: scaffold routes | assigned: be-tech-lead | files: src/backend/routes
- [ ] TASK-004: login page | assigned: fe-dev | files: src/frontend/pages
- [x] TASK-005: design system | assigned: fe-tech-lead | files: src/frontend/design

## Completed Tasks
_None._
TBEOF

STATUS_AGENTS=$(node "$HOOL_CLI" status -d "$PROJECT_ROOT" 2>&1)
if echo "$STATUS_AGENTS" | grep -q "Agent Progress"; then
  pass "hool status shows agent progress section"
else
  fail "hool status missing agent progress section"
fi

if echo "$STATUS_AGENTS" | grep -q "be-dev"; then
  pass "hool status shows be-dev agent"
else
  fail "hool status missing be-dev in agent progress"
fi

if echo "$STATUS_AGENTS" | grep -q "fe-dev"; then
  pass "hool status shows fe-dev agent"
else
  fail "hool status missing fe-dev in agent progress"
fi

# 10.13 Progress percentage is correct (2 done / 5 total = 40%)
if echo "$STATUS_AGENTS" | grep -q "40%"; then
  pass "hool status shows correct overall progress percentage"
else
  fail "hool status wrong progress percentage" "Expected 40%, got: $(echo "$STATUS_AGENTS" | grep '%')"
fi

# Restore original files
cat > "$PROJECT_ROOT/.hool/operations/bugs.md" << 'EOF'
# Bug Tracker

_No bugs reported yet._
EOF
cat > "$PROJECT_ROOT/.hool/operations/inconsistencies.md" << 'EOF'
# Inconsistencies

_No inconsistencies found yet._
EOF
rm -f "$PROJECT_ROOT/.hool/metrics/dispatch-count.txt"

# ============================================================
# RESULTS
# ============================================================
echo ""
echo "============================================="
echo "RESULTS: $PASS passed, $FAIL failed, $TOTAL total"
echo "============================================="

if [ $FAIL -gt 0 ]; then
  exit 1
else
  echo "ALL TESTS PASSED"
  exit 0
fi
