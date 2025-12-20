---
title: Shape transforms
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - transform
  - align
  - distribute
  - group
  - flip
  - rotate
  - stack
  - pack
---

## Overview

The shape transform system provides operations for manipulating multiple shapes together. This includes grouping and ungrouping shapes, aligning shapes to common edges or centers, distributing shapes evenly, stacking shapes with consistent gaps, packing shapes into compact arrangements, flipping shapes horizontally or vertically, and rotating shapes around a common center. These operations work on the current selection and respect parent-child relationships.

<!-- TODO: Expand this documentation -->

## Key files

- packages/editor/src/lib/editor/Editor.ts - Transform methods (groupShapes, alignShapes, distributeShapes, etc.)
- packages/editor/src/lib/utils/rotation.ts - Rotation utilities

## Related

- [Selection system](./selection-system.md)
- [Shape indexing](./shape-indexing.md)
