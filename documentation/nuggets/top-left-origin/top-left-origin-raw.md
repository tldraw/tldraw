---
title: Top-Left Origin - Raw Notes
created_at: 01/10/2026
updated_at: 01/10/2026
keywords:
  - coordinates
  - origin
  - browser
  - canvas
status: draft
date: 01/10/2026
order: 1
---

# Top-Left Origin - Raw Notes

## Seed text

Unlike most game engines, the viewport's origin (its zero point) is at its top left corner. Similarly, our `y` axis is flipped: it grows "north to south", with negative numbers above and positive numbers below.

In both cases, our decisions are designed to match the coordinate system of the browser, which similarly places its origin at the top left, with `y` values increasing as you travel "down" the page. There are certainly moments where we've wished for center origins (just wait for our article about rotation) and cartesian-style axes (try asking an LLM to plot a graph upside-down) but we believe the benefits of matching the browser's coordinate system outweigh the drawbacks.

## Key insight

tldraw deliberately uses browser-style coordinates (origin at top-left, y increasing downward) rather than Cartesian or game-engine style coordinates (origin at center, y increasing upward).

## Why this matters

Most canvas libraries and game engines use Cartesian coordinates:
- Origin at center of viewport
- Y-axis increases upward (like a math graph)
- Familiar from math class

But the browser uses a different system:
- Origin at top-left of element
- Y-axis increases downward
- clientX, clientY from mouse events
- CSS transforms
- Element positioning

## Benefits of matching browser

1. **No coordinate conversion at boundaries**: Mouse events give clientX/clientY directly usable
2. **CSS transforms match**: Can use same math for DOM overlays
3. **Mental model consistency**: What you see in DevTools matches internal state
4. **Easier debugging**: Fewer places where coordinates flip sign

## Drawbacks

1. **Rotation math**: Clockwise vs counterclockwise confusion
2. **Mathematical conventions**: Angles, trig functions expect Cartesian
3. **LLMs struggle**: Ask Claude to draw a graph and it'll be upside down
4. **Intuition from math class**: "Up" being negative feels wrong

## Code references

- `screenToPage` and `pageToScreen` in Editor.ts
- Vec class operations
- Mouse event handling
