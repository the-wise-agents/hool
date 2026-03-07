# v0.1: hool-context-mcp — Agentic Vector DB MCP

## What
A standalone, open-source MCP server that gives any AI coding agent semantic memory over a codebase. Point it at a directory, it auto-indexes and maintains itself.

## Why It's Novel
Nothing like this exists. Current vector DB MCPs expose raw operations (insert, query). This is opinionated and self-managing — agents just call `search_context` and `remember_this`.

## Core Features

### 1. Auto-Ingest
- Point at a directory → it watches and embeds
- File watcher detects changes → incremental re-embedding
- Only changed chunks update (not full re-index)

### 2. Smart Chunking
- `.ts/.js` → chunk by function/class
- `.md` → chunk by heading (## sections)
- `cold.md` (agent memory) → each line is its own chunk
- `.json` → chunk by top-level key
- Contracts → chunk by endpoint/entity
- Schema → chunk by table

### 3. Metadata Inference
Auto-tags each chunk:
```json
{
  "content": "...",
  "source": "phases/04-architecture/contracts.md",
  "section": "AUTH-001",
  "type": "contract",     // inferred from path + content
  "module": "auth",        // inferred from path
  "language": "markdown",
  "updated_at": "..."
}
```

### 4. Agent-Native MCP Interface

```
search_context(query, filters?)
  → "token refresh race condition"
  → filters: {type: "bug", module: "auth"}
  → returns top N relevant chunks with source references

store_context(content, metadata)
  → agents explicitly store insights/realizations
  → "redis sessions expire silently — need TTL refresh"

forget_context(source)
  → remove all chunks from a deleted/renamed file

get_context_stats()
  → how many chunks, by type, last updated
```

### 5. Self-Maintenance
- Deduplication: won't store same insight twice
- Relevance decay: recent context ranks higher
- Auto-cleanup: when files are deleted, chunks are removed
- Re-chunking: if a file's structure changes significantly, re-chunk entirely

## Tech Stack (proposed)
- Runtime: Node.js (npm package) or Python (pip package)
- Vector DB: ChromaDB (local, no external deps) or SQLite + vector extension
- Embedding: local model (all-MiniLM-L6-v2) or API-based
- MCP: standard MCP server protocol
- Config: zero-config default, optional `.hool-context.json` for overrides

## Config File (.hool-context.json)
```json
{
  "watch": ["src/", "phases/", "operations/", "memory/"],
  "ignore": ["node_modules/", "dist/", ".env", "*.lock"],
  "chunk_rules": {
    "*.md": "heading",
    "*.ts": "function",
    "**/cold.md": "line"
  },
  "embedding_model": "local",
  "max_results": 5
}
```

## Installation Vision
```bash
npx hool-context-mcp init   # creates config, starts indexing
npx hool-context-mcp serve  # runs MCP server
```

Add to Claude Code MCP config and it just works.

## Priority
IMMEDIATE — build this before starting any real project with hool-mini.
Without it, agents rely on grep + manifests (works for small projects, breaks at scale).
