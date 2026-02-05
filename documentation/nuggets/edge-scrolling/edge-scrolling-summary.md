---
title: Edge scrolling - Summary
created_at: 02/05/2026
---

# Edge scrolling

## The problem

- Edge scrolling must work for both mouse (single-pixel pointer) and touch (finger contact extends ~12px from reported center).
- Without compensation, touch users would need to push past the viewport edge to trigger scrolling.

## The solution

- Expand the effective touch pointer by 12 pixels in all directions (`coarsePointerWidth`).
- Two-phase timing: 200ms delay (prevents accidental triggers), then 200ms cubic ease-in to full speed.
- Proximity-based speed: closer to edge = faster scroll (linear 0-1 factor over 8-pixel zone).
- Small screen compensation: multiply speed by 0.612 when viewport dimension < 1000px.

## Key insight

- Touch pointer at x=20 with 12px width has effective left edge at x=8, triggering the 8-pixel edge zone — mouse at x=20 does not trigger because its effective edge is still at x=20.

## Implementation notes

- Main logic in `packages/editor/src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.ts`.
- Constants: 8px edge zone, 200ms delay, 200ms ease, 25 pixels/tick base speed, 12px touch width (`options.ts:136-140`).
- Cubic easing (`t³`) front-loads the slow phase for fine control, then accelerates hard.
- Scroll delta divided by zoom level so perceived speed stays constant regardless of zoom.
- Three activation conditions: must be dragging, must not be panning, camera must be unlocked.
- Viewport insets disable edge scrolling under UI elements (toolbars, sidebars).

## Why this matters

- Touch users get the same intuitive edge-scrolling experience as mouse users.
- The 200ms delay prevents accidental triggers while the cubic ramp gives fine control before committing to fast scroll.
