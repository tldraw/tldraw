---
title: '@tldraw/utils'
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - utils
  - utilities
  - helpers
  - functions
  - foundation
---

## Overview

`@tldraw/utils` provides shared utility functions with no dependency on other tldraw packages. It includes helpers for arrays, objects, math, and performance.

## Basic usage

```typescript
import { dedupe, minBy } from '@tldraw/utils'

const unique = dedupe([1, 2, 2, 3])
const smallest = minBy([{ x: 2 }, { x: 1 }], (v) => v.x)
```

## Key files

- packages/utils/src/index.ts - Package entry
- packages/utils/src/lib/array.ts - Array utilities
- packages/utils/src/lib/object.ts - Object utilities

## Related

- [@tldraw/validate](./validate.md)
