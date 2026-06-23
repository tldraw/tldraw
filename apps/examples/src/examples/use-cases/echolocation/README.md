---
title: Echolocation
component: ./EcholocationExample.tsx
priority: 4
keywords: [game, echolocation, sonar, pong, squash, drawing, freehand]
---

Squash against yourself, blind. The ball is invisible — draw a stroke to fire echoes that reveal and deflect it.

---

A minimal, slightly surreal squash game. There is one ball and you cannot really see it.
Draw a quick stroke anywhere on the canvas; it fires a short burst of fast "echoes" that
travel along the direction you drew. When an echo passes through the ball, the ball flashes
into view and bounces off the stroke like a wall. The only way to track the ball is to keep
pinging it with your own drawings.

This is the bare atom: one ball, freehand echoes, flash-on-contact. No score, no losing —
just the feel of finding and whipping an invisible ball with drawn sonar.
