---
title: Digital tape drawing
component: ./DigitalTapeExample.tsx
category: use-cases
priority: 6
keywords: [tape, drawing, smoothing, lazy, lag, indicator, overlay, animation, spacebar]
---

Two indicators trace smooth curves the way physical tape would.

---

A leader indicator follows your cursor. A second anchor indicator stays put
until you hold space, at which point it is pulled toward the leader along a
smooth, eased path. The trail it leaves behind is committed as a draw shape
when you release. This is a take on the digital tape drawing technique used
to ink curves with intentional, controlled strokes instead of free hand
wobble.
