---
title: Arrow obstacle avoidance
component: ./ArrowObstacleAvoidanceExample.tsx
priority: 0
keywords: [arrow, connector, obstacle, avoidance, routing, elbow]
---

Elbow arrows that automatically route around other shapes on the canvas.

---

This example shows how to enable `avoidObstacles` on arrow shapes so that elbow arrows automatically detect and route around intervening shapes.

The example uses a side effect to set `avoidObstacles: true` on all newly created arrows. Buttons let you toggle the behavior on existing arrows too.

A debug grid overlay shows the occupancy grid — red cells indicate areas blocked by shapes (with padding). The grid uses a fixed ~20px cell size in page space.

**To test:**

1. Draw an elbow arrow from the left rectangle to the right rectangle
2. The arrow should route around the middle rectangle
3. Drag the middle rectangle around — the arrow updates in real-time
4. Use the buttons to toggle avoidance on/off for all arrows
