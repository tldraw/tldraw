---
title: '@tldraw/tlschema'
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - schema
  - types
  - validation
  - migration
  - shapes
  - records
---

## Overview

`@tldraw/tlschema` defines the persisted data model: record types, validators, and migrations for shapes, pages, assets, and editor state.

## Basic usage

```typescript
import { TLBaseShape, createShapeId } from '@tldraw/tlschema'

type MyShape = TLBaseShape<'my-shape', { w: number; h: number }>
const id = createShapeId()
```

## Key concepts

- Record type definitions and validators
- Schema versions and migrations
- Shared style props

## Key files

- packages/tlschema/src/index.ts - Package entry
- packages/tlschema/src/records/ - Record definitions
- packages/tlschema/src/shapes/ - Shape schemas
- packages/tlschema/src/store-migrations.ts - Store migrations

## Related

- [Migrations](../architecture/migrations.md)
- [@tldraw/store](./store.md)
