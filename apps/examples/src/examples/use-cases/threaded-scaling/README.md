---
title: Threaded object scaling
component: ./ThreadedScalingExample.tsx
category: use-cases
priority: 5
keywords: [game, puzzle, scaling, resize, conservation, threads, overlay]
---

Resize circles that share a conserved pool of size along threads, until each one lands on its target.

---

A small puzzle about a conserved resource. Each circle can be resized by dragging
it — pull outward to grow, push inward to shrink. But threaded circles share a
single fixed pool of size: whatever you add to one is taken from its neighbours,
so growing one circle shrinks the others. Size only moves along the threads; it's
never created or destroyed.

- **Conservation.** Each connected group keeps a constant total size. The water
  fills between members, biased so larger circles give and take more.
- **The puzzle.** Every circle has a dashed target ring. Because you can't set
  sizes independently, solving a group is about the _order_ of pulls, not the
  arithmetic — a star transfers from the hub to every spoke at once, while a
  chain ripples end to end.
- **R** resets.

The board is one canvas overlay (`ThreadOverlayUtil`) drawing threads, nodes, and
target ghosts; drawn radii ease toward their conserved goals on the editor's
`tick` loop so each transfer reads as a springy give-and-take.
