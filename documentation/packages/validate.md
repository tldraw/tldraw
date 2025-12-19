---
title: '@tldraw/validate'
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - validate
  - validation
  - type safety
  - runtime
  - schema
---

## Overview

`@tldraw/validate` is a runtime validation library with TypeScript inference. It is used throughout tldraw for schema and API validation.

## Basic usage

```typescript
import { T } from '@tldraw/validate'

const name = T.string.validate('Alice')
const point = T.object({ x: T.number, y: T.number }).validate({ x: 1, y: 2 })
```

## Key files

- packages/validate/src/index.ts - Package entry
- packages/validate/src/lib/T.ts - Validator helpers
- packages/validate/src/lib/ValidationError.ts - Error types

## Related

- [@tldraw/tlschema](./tlschema.md)
- [@tldraw/store](./store.md)
