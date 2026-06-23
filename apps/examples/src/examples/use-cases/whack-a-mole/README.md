---
title: Whack-a-mole
component: ./WhackAMoleExample.tsx
category: use-cases
priority: 6
keywords: [game, mole, overlay, drag, blocks, canvas, loop]
---

Drag blocks over holes to bonk the moles before they pop out.

---

A "cheeky whack-a-mole" prototype where rich behavior emerges from a few local
rules rather than scripted AI. Moles emerge from three fixed holes (up to two at
once), each telegraphing with a low peek before committing to a full pop. Cover
a mole with a block to bonk it (a point); let it escape and you take a miss. You
only get two blocks for three holes, so you can never turtle.

The cheekiness comes from simple rules that interact:

- **Bonk shoves the block.** A bonked mole punches your block off its hole as it
  ducks — unless you pin it by hand. So a dropped block never stays parked.
- **Bait targeting.** Moles pop wherever is farthest from your blocks, making
  you run.
- **Blocks are physical.** They carry momentum (flick to throw), bounce off the
  play-area walls, and collide like billiards. A held block is immovable, so you
  can bulldoze others with it.

Out of this fall unscripted moments: a shoved block caroms into another hole and
bonks a second mole for a combo; blocks scatter and pile against the walls. The
board is never static. Holes, moles, and blocks render on a single canvas
overlay (`BoardOverlayUtil`) stepped off the editor's `tick` loop; blocks are
dragged by intercepting pointer events.
