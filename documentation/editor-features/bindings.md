---
title: Bindings
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - bindings
  - relationships
  - arrows
  - connections
  - BindingUtil
---

## Overview

The bindings system creates relationships between shapes. Bindings connect a "from" shape to a "to" shape with typed metadata, enabling features like arrows that stay attached to shapes when moved. Each binding type is managed by a `BindingUtil` class that defines how bindings are created, updated, and how they respond when connected shapes change.

<!-- TODO: Expand this documentation -->

## Key files

- packages/editor/src/lib/editor/bindings/BindingUtil.ts - Base binding utility class
- packages/editor/src/lib/editor/Editor.ts - Binding methods (createBinding, getBindingsFromShape, etc.)
- packages/editor/src/lib/editor/derivations/bindingsIndex.ts - Binding index derivation

## Related

- [Shape system](../architecture/shape-system.md)
- [Selection system](./selection-system.md)
