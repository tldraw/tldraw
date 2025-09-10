# CONTEXT.md - @tldraw/state-react

React integration layer for @tldraw/state signals, providing hooks and utilities to seamlessly use reactive state in React components.

## Package Overview

- **Purpose**: Bridges tldraw's signals system with React's component lifecycle and rendering
- **Type**: React Integration Library
- **Status**: Production
- **Dependencies**: `@tldraw/state`, `@tldraw/utils`, React 18+
- **Consumers**: All React-based tldraw applications (editor, dotcom, examples, vscode extension)

## Architecture

### Core Components

- **track()**: Higher-order component that automatically tracks signal dependencies during render
- **useValue()**: Hook to subscribe to individual signals and trigger re-renders on changes
- **useAtom()**: Hook to create and manage atoms within React lifecycle
- **useComputed()**: Hook to create computed signals that cleanup automatically
- **useReactor()**: Hook to run side effects that respond to signal changes
- **useStateTracking()**: Core tracking mechanism that captures signal dependencies

### Key Files

- `src/index.ts` - Main exports (track, useValue, useAtom, etc.)
- `src/lib/track.ts` - HOC for automatic signal tracking using React Proxy
- `src/lib/useValue.ts` - Signal subscription hook with useSyncExternalStore
- `src/lib/useAtom.ts` - Atom creation hook with React lifecycle integration
- `src/lib/useComputed.ts` - Computed signal hook with dependency management
- `src/lib/useReactor.ts` - Side effect hook for signal reactions
- `src/lib/useStateTracking.ts` - Core tracking implementation
- `src/lib/useQuickReactor.ts` - Optimized reactor for simple use cases

## API/Interface

### Public API

```tsx
import { track, useValue, useAtom } from '@tldraw/state-react'

// Method 1: track() HOC (recommended)
const Counter = track(function Counter() {
  const count = useAtom('count', 0)
  return <button onClick={() => count.set(count.get() + 1)}>
    {count.get()} // Automatically tracked, no manual subscription
  </button>
})

// Method 2: Manual subscription with useValue()
function Counter() {
  const count = useAtom('count', 0)
  const currentCount = useValue(count) // Manual subscription
  return <button onClick={() => count.set(count.get() + 1)}>
    {currentCount}
  </button>
}

// Computed values
const DoubleCounter = track(function DoubleCounter() {
  const count = useAtom('count', 0)
  const double = useComputed('double', () => count.get() * 2, [count])
  return <div>{double.get()}</div>
})

// Side effects
function Logger() {
  const count = useAtom('count', 0)
  useReactor('logger', () => {
    console.log('Count changed:', count.get())
  })
  return null
}
```

Main exports:
- `track(Component)` - HOC for automatic signal tracking
- `useValue(signal)` - Subscribe to signal changes
- `useAtom(name, initial, options?)` - Create atom with React lifecycle
- `useComputed(name, fn, deps)` - Create computed with cleanup
- `useReactor(name, effect)` - Run effects on signal changes

### Internal API

- `useStateTracking()` - Core tracking mechanism using React's render cycle
- `ProxyHandlers` - Proxy configuration for intercepting component calls
- `ReactMemoSymbol/ReactForwardRefSymbol` - React internals handling

## Development

### Setup

```bash
cd packages/state-react
yarn install
```

Requires React 18+ as peer dependency.

### Commands

- `yarn test` - Run Jest tests with React testing utilities
- `yarn build` - Build package
- `yarn lint` - Lint code

### Testing

- Tests use `react-test-renderer` for component testing
- Tests cover hooks behavior, component tracking, and cleanup
- Run tests: `yarn test`

## Integration Points

### Depends On

- `@tldraw/state` - Core signals implementation
- `@tldraw/utils` - Utility functions
- `react` - React 18+ (peer dependency)

### Used By

- `@tldraw/editor` - Main editor components use track() and signal hooks
- `@tldraw/tldraw` - UI components integrated with reactive state
- `apps/dotcom` - Main application components
- `apps/vscode` - VSCode extension UI
- `apps/examples` - Example applications and demos

## Common Issues & Solutions

### "Cannot read property 'get' of undefined"
- **Issue**: Signal accessed outside tracked context
- **Solution**: Wrap components with `track()` or use `useValue()` hook

### Re-renders not triggering
- **Issue**: Signals read outside render phase
- **Solution**: Ensure signal reads happen during component render, not in effects

### Memory leaks with useReactor
- **Issue**: Effects not cleaning up properly
- **Solution**: useReactor automatically handles cleanup, but ensure component unmounting is proper

### Performance with frequent updates
- **Issue**: Too many re-renders
- **Solution**: Use computed signals to batch updates, minimize signal reads in render

## Future Considerations

- React 18+ concurrent features integration
- Suspense integration for async computed values
- Server-side rendering improvements
- React DevTools integration for signal debugging
- Potential integration with React Compiler for automatic optimization