---
title: Click detection state machine - Summary
created_at: 02/05/2026
---

# Click detection state machine

## The problem

- Detecting double/triple/quadruple-clicks requires distinguishing clicks from drags, handling different timeouts for initial vs subsequent clicks, and avoiding race conditions when sequences overlap.
- Naive counter-based approaches can't handle spatial constraints, don't match OS timing conventions, and are difficult to extend.

## The solution

- Explicit state machine with six states: `idle`, `pendingDouble`, `pendingTriple`, `pendingQuadruple`, `pendingOverflow`, `overflow`.
- State advances on pointer_down (not pointer_up), allowing immediate UI feedback.
- Three event phases (`down`, `up`, `settle`) let tools respond at appropriate moments.
- Race conditions prevented via unique IDs checked when timeouts fire.

## Key insight

- First click emits normal pointer_down but transitions to `pendingDouble`; second click transitions to `pendingTriple` and emits `double_click` with phase `down` — tools don't wait for release.

## Implementation notes

- States defined in `packages/editor/src/lib/editor/managers/ClickManager/ClickManager.ts:7-13`.
- Two timeout values: 450ms for initial double-click, 200ms for subsequent multi-clicks (`options.ts:115-116`).
- Clicks must occur within 40 pixels (squared distance check avoids `Math.sqrt`).
- Drag detection cancels sequence: 4px threshold for mouse, 6px for touch.
- Uses `editor.timers.setTimeout()` for testability and `uniqueId()` (nanoid) for race condition prevention.

## Why this matters

- Users get instant visual feedback (e.g., text selection starts on double-click down, not after release).
- Explicit states make the system testable, extensible, and immune to timing bugs.
