---
title: '@tldraw/state-react'
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - react
  - state
  - signals
  - hooks
  - reactive
---

`@tldraw/state-react` provides React bindings for tldraw signals. Use `useValue`, `track`, and `useReactor` to connect signals to components.

## Basic usage

```tsx
import { atom } from '@tldraw/state'
import { useValue } from '@tldraw/state-react'

const count = atom('count', 0)

function Counter() {
	const value = useValue(count)
	return <div>{value}</div>
}
```

## Key files

- packages/state-react/src/index.ts - Package entry
- packages/state-react/src/lib/useValue.ts - useValue hook
- packages/state-react/src/lib/track.ts - track HOC

## Related

- [@tldraw/state](./state.md)
- [Reactive state](../architecture/reactive-state.md)
