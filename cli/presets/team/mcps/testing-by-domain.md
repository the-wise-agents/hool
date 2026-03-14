# Testing Strategy by Domain

How each project type gets tested, what MCP tools are available, and what gaps exist.

## Web App (FE + BE)

```
Layer        | Tool              | MCP          | Autonomous?
-------------|-------------------|--------------|------------
Static       | ESLint/TSC        | none (CLI)   | 100%
Unit (FE)    | Vitest/Jest       | none (CLI)   | 100%
Unit (BE)    | Vitest/Jest/Pytest| none (CLI)   | 100%
Integration  | Supertest/httpx   | none (CLI)   | 100%
E2E          | Playwright        | playwright   | 100%
Visual       | Playwright + multimodal | playwright | ~95%
```
**Gaps**: Subjective aesthetic judgment (~5% escalated).

## API / Backend Only

```
Layer        | Tool              | MCP          | Autonomous?
-------------|-------------------|--------------|------------
Static       | ESLint/TSC        | none (CLI)   | 100%
Unit         | Vitest/Jest/Pytest| none (CLI)   | 100%
Integration  | Supertest/httpx   | none (CLI)   | 100%
Contract     | Schema validation | none (CLI)   | 100%
Load         | k6/autocannon     | none (CLI)   | 90%
```
**Gaps**: Almost none. Best domain for autonomy.

## Browser Game

```
Layer        | Tool              | MCP          | Autonomous?
-------------|-------------------|--------------|------------
Static       | ESLint/TSC        | none (CLI)   | 100%
Unit (logic) | Vitest/Jest       | none (CLI)   | 100%
Visual       | Playwright screenshot | playwright | ~60%
Game E2E     | Playwright + game state bridge | playwright | ~50%
Performance  | FPS monitoring    | playwright   | 90%
Game feel    | Human playtest    | none         | 0%
```
**Gaps**: Canvas interactions are coordinate-based, "is this fun" always requires human.

## Mobile App

```
Layer        | Tool              | MCP          | Autonomous?
-------------|-------------------|--------------|------------
Static       | ESLint/TSC        | none (CLI)   | 100%
Unit         | Jest              | none (CLI)   | 100%
Integration  | Supertest (API)   | none (CLI)   | 100%
E2E          | Maestro or Detox  | none         | ~80%
Visual       | Emulator screenshot| none        | ~70%
```
**Gaps**: No Playwright MCP — E2E relies on Maestro/Detox CLI. Real device testing not covered.

## Summary

| Domain | Coverage | Biggest Gap | MCP Tools |
|--------|----------|-------------|-----------|
| Web App | ~95% | Aesthetic judgment | context7, deepwiki, playwright |
| API Only | ~98% | Security edge cases | context7, deepwiki |
| CLI Tool | ~95% | Integration testing | context7, deepwiki |
| Browser Game | ~55% | Game feel | context7, deepwiki, playwright |
| Mobile | ~70% | Device matrix | context7, deepwiki |
| Animation | ~50% | Smoothness feel | context7, deepwiki, playwright |
