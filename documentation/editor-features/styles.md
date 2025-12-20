---
title: Styles
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - styles
  - StyleProp
  - color
  - opacity
  - shared styles
---

## Overview

The styles system manages visual properties like color, size, font, and opacity across shapes. Style properties are defined using `StyleProp` instances that specify valid values and defaults. The editor tracks "shared styles" across the current selection, indicating whether all selected shapes share the same value or have mixed values. Styles can be applied to selected shapes or set for the next shape to be created.

<!-- TODO: Expand this documentation -->

## Key files

- packages/editor/src/lib/editor/Editor.ts - Style methods (getSharedStyles, setStyleForSelectedShapes, etc.)
- packages/tlschema/src/styles/StyleProp.ts - StyleProp class definition
- packages/editor/src/lib/utils/SharedStylesMap.ts - Shared style computation

## Related

- [Selection system](./selection-system.md)
