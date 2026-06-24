---
title: Signal wars
component: ./SignalWarsExample.tsx
priority: 5
keywords: [game, strategy, territory, signal, verlet, physics, rts, go, ai, overlay]
---

Build and cut signal lines to spread your color across a 19×19 board against an AI.

---

A StarCraft-meets-Go real-time strategy game built on a verlet-rope signal
network. Red (you) starts in one corner, blue (the AI) in the opposite one. Each
home source emits colored pulses that crawl the wires, branch at pegs, and
deposit charge wherever they land. The dominant color owns a peg; your score is
how many pegs you own.

- **Territory spreads itself.** Every peg you own re-emits your color on a slow
  timer, so owned ground pushes outward into neutral and enemy territory, forming
  moving fronts. Cut a region off from its emitters and it decays to neutral —
  Go-style capture by disconnection.
- **Economy.** Every owned peg adds energy to your bank each tick, so more
  territory means a faster economy and the StarCraft snowball. Building wires
  costs energy proportional to length.
- **Two verbs.** Drag from one of your pegs to build a new wire to a peg in range
  (green preview = affordable, dim = not). Swipe anywhere else to cut — sever an
  enemy's supply lines to starve their territory.
- **Win** by capturing the enemy's home source or holding a 60% board majority.
- **R** resets.

Wires are stiff verlet ropes on a single canvas overlay (`WarsOverlayUtil`),
stepped off the editor's `tick` loop. The blue AI expands and harasses on a slow,
readable cadence using the same build and cut functions you do.
