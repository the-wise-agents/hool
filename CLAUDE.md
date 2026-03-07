# HOOL — Agent-Driven SDLC

Agents drive the project. Humans stay out of the loop.

## Repository Structure

- `cli/` — unified CLI (`hool` npm package). Entry point for all engines.
- `hool-mini/` — lightweight engine: file-based state, structured prompts, existing agentic primitives
- `hool-mega/` — (future) full multi-agent engine: gossip protocol, locks, shared state

## Engines

- **hool-mini**: For simpler projects. Uses CLAUDE.md/cursor rules, skills, subagents, MCPs.
- **hool-mega**: For truly autonomous projects. Custom multi-agent architecture. (Coming later)

## CLI

```
hool init              # defaults to --mini
hool init --mini       # lightweight engine
hool init --mega       # full multi-agent engine (future)
hool status
hool reset
```

## Conventions

- All agent/phase docs use numbered prefixes (01-, 02-) to enforce reading order
- Work logs are one-liners, ultra-crisp
- Every phase reads all prior phase docs before producing output
- If measurable, autonomous. If subjective, escalate to needs-human-review.md.
