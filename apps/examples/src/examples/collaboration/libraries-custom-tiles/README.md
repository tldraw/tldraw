---
title: Custom library tiles
component: ./LibrariesCustomTilesExample.tsx
priority: 16
keywords: [libraries, library, tiles, items, components, overrides, meta, badge, caption]
---

Wrap the libraries panel's item tiles to show more about each item.

---

The `ItemTile` override receives the item, so it can show anything stored on it. This one wraps the default `ItemTile` with the item's name as a caption, and a "New" badge on items whose `meta` marks them as new.
