---
title: Contested flow
component: ./SignalTerritoryExample.tsx
priority: 5
keywords: [game, strategy, territory, signal, verlet, physics, two player, overlay]
---

Two players push colored signals across a peg grid to claim territory in real time.

---

A two-player hot-seat territory game built on a verlet-rope signal network. Red
and blue sources sit in opposite corners and emit colored pulses that crawl
along the wires, branch at pegs, and deposit charge wherever they land. The
dominant color owns a peg; your score is how many pegs you own.

- **Decay.** All charge bleeds away every tick, so nothing is permanent. Cut an
  enemy's supply line and the territory it fed collapses within a couple of
  seconds.
- **Split charge.** A pulse divides its strength among every branch at a peg, so
  spreading wide dilutes your signal while a concentrated line punches deep.
- **Cut and rewire.** Swipe across a wire to sever it. Drag a loose end onto a
  peg to re-pin it, flinging your color into contested ground.
- **R** resets.

Both players share the mouse — cut or rewire anything, any time. Wires are stiff
verlet ropes on a single canvas overlay (`TerritoryOverlayUtil`), stepped off
the editor's `tick` loop.
