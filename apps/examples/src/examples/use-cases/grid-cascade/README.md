---
title: Overload cascade
component: ./GridCascadeExample.tsx
priority: 5
keywords: [game, signal, grid, verlet, physics, heat, overload, cascade, survival, overlay]
---

Keep the signal flowing as the network heats up and wires burn out under load.

---

A single-player survival game built on a verlet signal grid. A source peg (green,
top) emits pulses that crawl the wires and branch at junctions; an output peg
(orange, bottom) must keep receiving them.

- Every pulse that crosses a wire raises its **heat**. Wires tint orange then red
  and thicken as they load up, and cool slowly when idle.
- A wire that overloads **burns out** — it snaps with a white flash, its ends
  fall, and any pulse on it dies. Its traffic shifts to neighbours, so cascades
  can chain.
- The source emits **faster and faster** as the round ages, so pressure ramps
  with no authored levels.
- If the output goes more than ~4s without a signal, it's **game over**. The HUD
  shows seconds survived and signals delivered.

The loop: build redundant paths (longer routes add latency but spread load) and
proactively cut hot wires to shed load before a cascade chain-reacts.

- **Swipe** across a wire to cut it.
- **Drag** a loose end onto a peg to re-pin it and reroute the signal.
- **R** resets.

Wires are stiff verlet ropes on a single canvas overlay (`StrandsOverlayUtil`),
stepped off the editor's `tick` loop.
