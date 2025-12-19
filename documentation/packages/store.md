---
title: '@tldraw/store'
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - store
  - reactive
  - database
  - records
  - state
---

## Overview

`@tldraw/store` is a reactive record database built on `@tldraw/state`. It handles record validation, migrations, and change tracking.

## Basic usage

```typescript
import { createRecordType, Store } from '@tldraw/store'

const TodoRecord = createRecordType<Todo>('todo', {
	validator: todoValidator,
	scope: 'document',
})

const store = new Store({
	schema: { recordTypes: [TodoRecord] },
})

store.put([TodoRecord.create({ id: TodoRecord.createId('1'), title: 'Ship', completed: false })])
```

## Key concepts

- Record types and validators
- Schema versions and migrations
- Reactive change events

## Key files

- packages/store/src/index.ts - Package entry
- packages/store/src/lib/Store.ts - Store implementation
- packages/store/src/lib/StoreSchema.ts - Schema and migrations

## Related

- [Store and records](../architecture/store-records.md)
- [@tldraw/state](./state.md)
