# Governor Rules

<!-- Hard rules that all agents must follow. Governor audits against these. -->
<!-- Governor can APPEND new rules but NEVER modify or remove existing ones. -->

## Core Rules

- [CRITICAL] No agent may modify its own prompt file or any other agent's prompt file. Escalate to needs-human-review.md.
- [CRITICAL] Product Lead must NEVER edit files in src/frontend/ or src/backend/ directly. Always message the assigned teammate.
- [CRITICAL] Devs must NEVER make architectural decisions. Follow LLD exactly. Message lead if something should change.
- [CRITICAL] No agent may modify governor-rules.md except the Governor (append only) or a human.
- [HIGH] All agents must update their memory files (cold.md, hot.md, task-log.md) before going idle.
- [HIGH] All agents must read governor-feedback.md before starting work and verify they don't repeat violations.
- [HIGH] Devs must follow TDD: write tests before implementation. Implementation-first is a violation.
- [HIGH] FE Dev and FE Lead commit to src/frontend/ git only. BE Dev and BE Lead commit to src/backend/ git only. Cross-repo commits are violations.
- [HIGH] Contracts in .hool/phases/05-contracts/ are the source of truth for API shapes. Any deviation by devs is a violation.
- [MEDIUM] All agents must read their client-preferences.md before making decisions and honour preferences.
- [MEDIUM] No agent may create files outside their writable paths.
- [MEDIUM] Agents must use teammate messaging for real-time coordination, not file-based routing.

## Added Rules
<!-- Governor appends new rules below this line -->
