---
title: Modifier key release delay - Summary
created_at: 02/05/2026
---

# Modifier key release delay

## The problem

- Users release modifier keys (shift, alt, ctrl, meta) and mouse button "at the same time" when ending a modified drag.
- Events arrive separately — keyup sometimes arrives 10-50ms before mouseup.
- Result: drag ends without the modifier, snapping to wrong position or losing constraint.

## The solution

- Delay clearing the modifier flag by 150ms after keyup.
- If mouseup arrives within that window, the drag completes with the modifier still "held."
- After 150ms, dispatch a synthetic key_up event so tools can respond.

## Key insight

- The 150ms delay is long enough to cover typical keyup-to-mouseup gaps but short enough not to feel "sticky" on subsequent drags — human reaction time creates a natural window.

## Implementation notes

- Four separate timeouts, one per modifier (`_shiftKeyTimeout`, `_altKeyTimeout`, `_ctrlKeyTimeout`, `_metaKeyTimeout`) in `packages/editor/src/lib/editor/Editor.ts:10101-10175`.
- On keyup: if modifier was held and no timeout running, start 150ms timer (`Editor.ts:10303-10332`).
- On key down: clear any pending timeout immediately.
- Timeout callback sets the flag to false and dispatches synthetic key_up event.

## Why this matters

- Shift+drag constrains to axis, Alt+drag clones, Ctrl/Cmd+drag toggles snap — all break if modifier clears early.
- Users perceive releasing together as a single action; the delay makes the software match that mental model.
