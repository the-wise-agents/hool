# HOOL — Human Out Of Loop

Agent-Driven SDLC. Describe what you want to build, then step away. Agents handle spec, design, architecture, implementation, testing, and bug fixing.

## Quick Start

```bash
npx hool-cli init
```

You'll be asked three questions:
1. **Platform** — Claude Code, Cursor, or generic
2. **Project type** — web app, browser game, mobile, CLI tool, API, desktop, animation, or other
3. **Mode** — Interactive (you review spec/design/architecture) or Full-HOOL (fully autonomous)

Then open your AI coding tool and tell it:

```
Read .hool/prompts/orchestrator.md and begin Phase 1: Brainstorm
```

## Commands

```bash
npx hool-cli init              # Scaffold HOOL in current directory
npx hool-cli status            # Show current phase and task summary
npx hool-cli reset             # Reset operations and memory (keeps phase docs)
```

Or install globally:

```bash
npm install -g hool-cli
hool init
hool status
```

## Documentation

Full documentation: [github.com/the-wise-agents/hool](https://github.com/the-wise-agents/hool)

## License

MIT
