---
title: History system
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - undo
  - redo
  - history
  - HistoryManager
  - marks
  - batch
---

The history system provides undo/redo functionality through the `HistoryManager`. It tracks changes to the store in batches, using "marks" as stopping points. The system supports squashing changes, bailing to previous states, and ignoring certain changes from history. It integrates with the reactive store to automatically capture all record modifications.

## Key files

- packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts - Core undo/redo logic
- packages/editor/src/lib/editor/types/history-types.ts - History batch options

## Related

- [Store](../packages/store.md)
