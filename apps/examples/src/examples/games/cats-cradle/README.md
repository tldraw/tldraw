---
title: Cat's cradle
component: ./CatsCradleExample.tsx
priority: 5
keywords: [game, string, rope, verlet, physics, gravity, pegs, swing, overlay]
---

Cut the signal wires between pegs and rewire them to keep the signal flowing.

---

A signal-flow prototype. A source peg (green, top) emits pulses that crawl along
the wires and branch at junctions; an output peg (orange, bottom) counts the
pulses that arrive.

- **Swipe** across a wire to cut it — a red laser stroke severs it and fades
  out. The pulse riding that wire dies with it.
- **Drag** a loose wire end onto a peg to re-pin it, rerouting the signal —
  catch it with momentum and you can fling a strand across the board.
- **R** resets.

Wires are stiff verlet ropes on a single canvas overlay (`StrandsOverlayUtil`),
stepped off the editor's `tick` loop.
