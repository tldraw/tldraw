---
title: Arrow obstacle avoidance edge cases
component: ./ArrowObstacleAvoidanceEdgeCasesExample.tsx
priority: 0
keywords: [arrow, obstacle, avoidance, routing, elbow, edge-case, test]
---

Edge case test suite for elbow arrow obstacle avoidance.

---

Load individual scenarios or all at once to spot-test routing behavior. Each scenario targets a specific edge case:

1. **Narrow gap** — 10px gap between shapes (grid cells are 20px)
2. **Touching shapes** — 0px gap between obstacle and endpoints
3. **Overlapping shapes** — source and target overlap with obstacle between
4. **Horizontally aligned** — all shapes on same Y, tests routing direction preference
5. **Vertically aligned** — all shapes stacked, tests vertical routing
6. **Enclosed target** — target surrounded by obstacles on all sides
7. **Non-rectangular shapes** — circles and diamonds (AABB over-padding)
8. **Multiple arrows same pair** — two arrows between same shapes (no nudging)
9. **Chain A->B->C** — arrow chain, moving B reroutes both
10. **Large obstacle** — one huge obstacle between two small shapes
11. **Maze-like dense** — many small obstacles forming a maze
12. **With vs without** — same layout, one arrow avoids, one doesn't
