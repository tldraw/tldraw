---
title: Pages
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - page
  - pages
  - multi-page
  - navigation
---

## Overview

The pages system manages multiple drawing surfaces within a single document. Each page has its own set of shapes and instance state (camera position, selection, etc.). The editor provides methods for creating, deleting, duplicating, and navigating between pages. Shapes can be moved between pages while preserving their properties and bindings.

<!-- TODO: Expand this documentation -->

## Key files

- packages/editor/src/lib/editor/Editor.ts - Page methods (createPage, deletePage, setCurrentPage, etc.)
- packages/tlschema/src/records/TLPage.ts - Page record type
- packages/tlschema/src/records/TLInstancePageState.ts - Per-page instance state

## Related

- [Camera system](./camera-system.md)
- [Selection system](./selection-system.md)
