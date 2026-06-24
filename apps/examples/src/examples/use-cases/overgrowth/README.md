---
title: Overgrowth
component: ./OvergrowthExample.tsx
priority: 5
keywords:
  [
    game,
    strategy,
    territory,
    vines,
    growth,
    tree,
    branching,
    siege,
    procedural,
    rts,
    ai,
    overlay,
    zoom,
    lod,
  ]
---

A zoomable grow-and-prune siege war on a procedural cave: cut vines to direct your growth and besiege the enemy core.

---

Two colors creep across a large procedurally-generated cave — open chambers
joined by corridor chokepoints — as branching tendrils. Red (you) and blue (the
opponent) each defend a **core** in its own chamber. Each color's network is a
strict tree rooted at its core, so **cutting any vine disconnects everything past
it** — the orphaned branch withers to neutral. Prune near a trunk to kill a whole
limb; trim a leaf for almost nothing.

**Kill the core to win.** Each core has HP (shown as a ring on the core and a bar
in the HUD, readable at every zoom level). Push your vines across the map to the
enemy core and **hold presence** there: while enemy vine-pegs sit next to a core
it loses HP; relieve the siege and it regenerates. Besiege the enemy core to 0 —
or lose if yours falls. The map is symmetric (180° rotation) so neither side is
favored, and a flood-fill guarantees the chambers are connected by corridors.

You **read** the game zoomed out (whose territory is winning, where the fat
trunks and the cores are) but you can only **act** zoomed in (surgical cuts).
Blue never cuts — it's a spreading force of nature, and its growth pulls toward
your core, so it's racing to besiege you while you race to besiege it.

- **Growth comes in waves.** Every few ticks a growth pulse fires and all active
  tendril tips surge outward together, then pause — a rhythm you prune between.
  Tips wander, fork, and die off, so vines look organic and chaotic, not a blob.
- **Withering is connectivity.** Every tick a BFS from each home marks reachable
  cells. Reachable stay bright; orphaned ones fade fast (~1s). Cut a vine and the
  whole subtree beyond it goes dark.
- **Cuts are gated.** A cut only registers when zoomed in past a threshold
  ("zoom in to cut" otherwise). And to cut an **enemy** vine you need presence —
  a living vine of your own nearby; out-of-reach enemy vines render dimmer. You
  can always cut your **own** vines to steer.
- **Chokes and the hydra.** Cutting a thick enemy vine (a big orphaned subtree)
  is a devastating **choke**. Cutting a thin enemy leaf **backfires**: a hydra —
  the enemy sprouts new tips on the surviving side and grows back bushier. Vine
  thickness shows subtree size, so the trunks to cut are the fat ones.
- **Pruning sticks.** Cutting kills the tips on the orphaned branch immediately
  and locks the cut cells out of re-sprouting, so a cleared area holds — and the
  freed neutral ground is a lane your own vines can then push through.
- **Win** by besieging the enemy core to 0 HP. **Lose** if your core falls.
- **R** resets (and regenerates a fresh symmetric map).

**Controls.** Left-drag prunes (only when zoomed in). Scroll/pinch to zoom
(sped up), space-drag (or middle/right drag) to pan — those go straight to
tldraw's native camera, so only a plain left-drag is a cut.

**Zoom levels of detail.** Far out, territory draws as a colored heatmap over
dark rock obstacles, with both cores' HP rings still visible (the win-read). Mid
zoom shows vine lines (thick = trunk, thin = leaf) and glowing tip buds. Zoomed
in adds animated electricity sparks — a bounded pool spawned only on vines inside
the viewport, so spark cost tracks what's on screen, never the board size.
Everything is culled to the viewport and bucketed by grid cell, so per-frame cost
is O(visible). Both colors grow automatically; the human is the only pruner.
