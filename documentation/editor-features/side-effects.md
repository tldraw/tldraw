---
title: Side effects
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - side effects
  - store
  - hooks
  - validation
  - cleanup
---

## Overview

The side effects system enforces store consistency and triggers reactions when records change. Side effects are functions that run before or after records are created, updated, or deleted. "Before" handlers can modify or reject changes, while "after" handlers react to changes that have already occurred. The editor uses side effects to maintain invariants like filtering invalid selections, updating focused groups, and cleaning up bindings when shapes are deleted.

<!-- TODO: Expand this documentation -->

## Key files

- packages/store/src/lib/StoreSideEffects.ts - Side effect registration and execution
- packages/editor/src/lib/editor/Editor.ts - Editor-level side effect setup

## Related

- [Store](../packages/store.md)
- [History system](./history-system.md)
