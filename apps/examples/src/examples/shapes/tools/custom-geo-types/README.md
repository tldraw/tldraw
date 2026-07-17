---
title: Custom geo types
component: ./CustomGeoTypesExample.tsx
category: shapes/tools
priority: 3
keywords: [geo, custom, shape, extend, configure, geometry, path]
---

Add custom geo types that plug into the existing geo shape system.

---

Use `GeoShapeUtil.configure()` with a `customGeoTypes` map to register new geometric shape types. Each custom type provides its own path geometry, snap behavior, default size, and style panel icon, while inheriting all standard geo shape features like labels, resizing, fill styles, and SVG export.
