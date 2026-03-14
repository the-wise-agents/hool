# Testing Strategy by Domain

How each project type gets tested, what tools are used, and what gaps exist.

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
**Verdict**: Fully covered.

## Mobile App (React Native + Expo)

```
Layer        | Tool              | MCP          | Autonomous?
-------------|-------------------|--------------|------------
Static       | ESLint/TSC        | none (CLI)   | 100%
Unit         | Jest              | none (CLI)   | 100%
Integration  | Supertest (API)   | none (CLI)   | 100%
E2E          | Maestro or Detox  | adb/maestro  | ~80%
Visual       | ADB screenshot + multimodal | adb | ~70%
Device compat| Emulator only     | adb          | ~60%
```
**Gaps**:
- E2E setup is fragile (emulator boot, build times)
- Visual comparison against design cards needs emulator screenshots (lower fidelity than browser)
- No real device testing — emulator only covers ~70% of real-world behavior
- Gestures (swipe, pinch, long-press) are harder to automate reliably

**What helps**: Maestro over Detox. Maestro tests look like:
```yaml
- launchApp
- tapOn: "Login"
- inputText: "user@test.com"
- tapOn: "Submit"
- assertVisible: "Welcome"
```
An agent can write and reason about this easily. Detox requires complex JS setup.

## Browser Game

```
Layer        | Tool              | MCP          | Autonomous?
-------------|-------------------|--------------|------------
Static       | ESLint/TSC        | none (CLI)   | 100%
Unit (logic) | Vitest/Jest       | none (CLI)   | 100%
State tests  | Custom harness    | none (CLI)   | 100%
Visual       | Playwright screenshot | playwright | ~60%
Game E2E     | Playwright + game state bridge | playwright | ~50%
Game feel    | Human playtest    | none         | 0%
Performance  | FPS monitoring    | playwright   | 90%
```

**The game state bridge pattern**:
The FE Tech Lead adds a debug hook to the game:
```typescript
// Only in dev mode
if (import.meta.env.DEV) {
  (window as any).__GAME__ = {
    getState: () => game.state,
    dispatch: (action: string, payload: any) => game.dispatch(action, payload),
    getEntity: (id: string) => game.world.getEntity(id),
    getFPS: () => game.loop.fps,
  };
}
```

Then Playwright tests can:
```typescript
// Click at game coordinates
await page.mouse.click(400, 300);
// Read game state
const score = await page.evaluate(() => window.__GAME__.getState().score);
expect(score).toBe(10);
```

**Gaps**:
- Can't test "is this fun" — always human
- Canvas interactions are coordinate-based, not semantic (fragile if layout changes)
- Physics-dependent tests are non-deterministic unless you seed the RNG
- Audio testing is basically impossible

**What helps**: Replay testing. Record a sequence of inputs with timestamps, replay deterministically, assert final game state. Agent writes the replay, not the clicks.

## Android Game

```
Layer        | Tool              | MCP          | Autonomous?
-------------|-------------------|--------------|------------
Static       | Lint/TSC/Kotlin   | none (CLI)   | 100%
Unit (logic) | Jest/JUnit        | none (CLI)   | 100%
E2E          | ADB + game state  | adb          | ~30%
Visual       | ADB screenshot    | adb          | ~40%
Game feel    | Human playtest    | none         | 0%
Performance  | ADB profiling     | adb          | ~60%
```

**Gaps**: Almost everything beyond unit tests. ADB can tap and screenshot but:
- No game state bridge unless the game exposes one via a debug API
- Performance profiling through ADB is limited vs native Android Profiler
- Touch gesture sequences (multi-touch, tilt) are extremely hard to automate

**Honest verdict**: Test game logic with unit tests (autonomous). Test everything else manually. This is the weakest domain.

## API / Backend Only

```
Layer        | Tool              | MCP          | Autonomous?
-------------|-------------------|--------------|------------
Static       | ESLint/TSC/Pylint | none (CLI)   | 100%
Unit         | Vitest/Jest/Pytest| none (CLI)   | 100%
Integration  | Supertest/httpx   | none (CLI)   | 100%
Contract     | Schema validation | none (CLI)   | 100%
Load         | k6/autocannon     | none (CLI)   | 90%
Security     | Basic checks      | none (CLI)   | 70%
```

**Gaps**: Almost none. APIs are the most testable thing that exists.
**Verdict**: Best domain for full autonomy.

## Summary Matrix

| Domain | Autonomous Testing Coverage | Biggest Gap |
|--------|---------------------------|-------------|
| Web App | ~95% | Aesthetic judgment |
| API Only | ~98% | Security edge cases |
| Mobile (RN) | ~70% | E2E reliability, device matrix |
| Browser Game | ~55% | Game feel, canvas interaction |
| Android Game | ~30% | Everything beyond unit tests |
| Animation | ~50% | "Does it feel smooth" |
