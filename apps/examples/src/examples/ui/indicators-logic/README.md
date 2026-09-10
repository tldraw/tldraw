---
title: Custom indicators
component: ./IndicatorsLogicExample.tsx
priority: 3
keywords:
  [
    indicators,
    shape indicator,
    overlay,
    overlayutils,
    shapeindicatoroverlayutil,
    getrenderingshapes,
  ]
---

Change when shape indicators are shown by replacing the shape indicator overlay util.

---

Shape indicators are the outlines drawn around a shape when you hover or select it. They're rendered by `ShapeIndicatorOverlayUtil`. Subclass it, override `getOverlays()` to return the ids you want outlined, and pass it in the `overlayUtils` prop. Because it shares the built-in util's `type`, it replaces the default rather than adding a second layer.

This example outlines every rendered shape all of the time. Try adding shapes or zooming out; each visible shape, including the group's children, keeps its outline.
