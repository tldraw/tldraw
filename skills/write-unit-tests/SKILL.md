---
name: write-unit-tests
description: Writing unit and integration tests for the tldraw SDK. Use when creating new tests, adding test coverage, or fixing failing tests in packages/editor or packages/tldraw. Covers Vitest patterns, TestEditor usage, and test file organization.
---

# Writing tests

Unit and integration tests use Vitest and run from workspace directories, not the repo root.

Read a neighboring test before writing a new one — the existing suites are the specification for how we test, and they stay current in a way prose can't. Good starting points:

- `packages/tldraw/src/test/SelectTool.test.ts` — tool state machine assertions
- `packages/tldraw/src/test/resizing.test.ts` — pointer-driven interaction with handles
- `packages/tldraw/src/lib/shapes/arrow/ArrowShapeUtil.test.ts` — shape util plus bindings
- `packages/editor/src/lib/editor/managers/ClickManager/ClickManager.test.ts` — a UI-free manager
- `packages/editor/src/lib/primitives/Vec.test.ts` — a plain primitive

For the available `TestEditor` methods, read the class itself rather than a list here: `packages/tldraw/src/test/TestEditor.ts`.

## Which workspace

- `packages/editor` — core primitives, geometry, managers, base editor behavior that must not depend on default shapes or UI.
- `packages/tldraw` — anything needing default shapes or tools, which is most integration tests.

Each package has its own `TestEditor`, and they are not interchangeable: `packages/editor/src/lib/test/TestEditor.ts` has no default shapes or tools, `packages/tldraw/src/test/TestEditor.ts` wires up the full SDK. Import from the package you're testing in.

```bash
cd packages/tldraw && yarn test run
cd packages/tldraw && yarn test run --grep "SelectTool"
cd packages/tldraw && yarn test          # watch mode
```

## Placement

Unit tests sit next to the file they cover (`Vec.ts` → `Vec.test.ts`). Cross-cutting integration tests live in `packages/tldraw/src/test/`. Shape and tool tests sit with the implementation, not in `src/test/`.

## Gotchas

These are the things reading an existing test won't tell you.

**Wheel and pinch events are batched.** `dispatch()` alone won't apply them — emit a tick to flush:

```typescript
editor.dispatch(wheelEvent)
editor.emit('tick', 16)
```

See `packages/editor/src/lib/editor/Editor.test.ts` for the full pattern.

**`toCloselyMatchObject` is ours, not Vitest's.** Use it instead of `toMatchObject` whenever floating-point geometry is involved, or tests fail on rounding noise. It takes an optional `roundToNearest`. Defined in `packages/tldraw/src/test/TestEditor.ts`.

**Animation-dependent code needs the rAF stub.** `vi.useFakeTimers()` alone isn't enough, because requestAnimationFrame isn't driven by the fake clock. Tests that animate replace it at module scope — see the top of `packages/tldraw/src/lib/shapes/arrow/ArrowShapeUtil.test.ts`.

**Dispose the editor in `afterEach`.** `editor?.dispose()` releases the reactive subscriptions and timers the editor holds; without it they leak across tests in the same file. Suites that build up shapes also tend to clear them in `beforeEach` so each test starts from a known page.

**Always `mockRestore()` a `vi.spyOn` on the editor.** Editor instances outlive individual assertions within a suite, so an unrestored spy silently changes later tests.

## Conventions

- Use `createShapeId()` for shape IDs so they're stable and typed.
- Prefer comparing whole objects over field-by-field assertions when it gives a clearer failure.
- Use `editor.expectToBeIn('select.idle')` for state machine assertions rather than reaching into internals.
- `@ts-expect-error` is the way to assert that invalid props are rejected at the type level.
