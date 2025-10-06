# @tldraw/state-react Documentation

## 1. Introduction

### What is @tldraw/state-react?

@tldraw/state-react is a React integration library that bridges the reactive **signals** system from @tldraw/state with React components. It provides hooks and utilities for using reactive state in React applications with automatic dependency tracking and fine-grained updates.

This library extends [@tldraw/state](../state/DOCS.md) with React-specific bindings, offering familiar hook patterns while maintaining the performance characteristics of the underlying signals system.

### Installation

```bash
npm install @tldraw/state-react @tldraw/state react
```

### TypeScript

@tldraw/state-react is written in TypeScript and provides excellent type safety out of the box. No additional types package needed.

### Quick Example

Here's a simple counter to show how @tldraw/state-react works:

```ts
import { useAtom, track } from '@tldraw/state-react'

const Counter = track(function Counter() {
  const count = useAtom('count', 0)

  return (
    <button onClick={() => count.set(count.get() + 1)}>
      Count: {count.get()}
    </button>
  )
})
```

The `track` function automatically detects when signals are accessed and re-renders the component only when those specific signals change.

## 2. Core Hooks

### useValue: Reading Signal Values

**useValue** is the fundamental hook for extracting values from signals and subscribing to changes. It comes in two forms: direct signal subscription and computed values.

#### Reading Signal Values

You can use `useValue` to extract the current value from any signal:

```ts
import { atom } from '@tldraw/state'
import { useValue } from '@tldraw/state-react'

const name = atom('name', 'World')

function Greeter() {
  const currentName = useValue(name)
  return <h1>Hello, {currentName}!</h1>
}
```

When `name` changes, the `Greeter` component automatically re-renders with the new value.

#### Creating Computed Values

You can also pass a function to `useValue` to create computed values with automatic dependency tracking:

```ts
import { atom } from '@tldraw/state'
import { useValue } from '@tldraw/state-react'

const firstName = atom('firstName', 'John')
const lastName = atom('lastName', 'Doe')

function UserProfile() {
  const fullName = useValue('fullName', () => {
    return `${firstName.get()} ${lastName.get()}`
  }, [firstName, lastName])

  return <div>User: {fullName}</div>
}
```

> Tip: The dependency array works like other React hooks - include all signals that your computed function depends on.

### useAtom: Component-Local Reactive State

**useAtom** creates reactive atoms that are scoped to your component instance. This is perfect for component-local state that you want to be reactive.

#### Creating Local Atoms

```ts
import { useAtom } from '@tldraw/state-react'

function TodoItem() {
  const completed = useAtom('completed', false)
  const text = useAtom('text', 'New todo')

  return (
    <div>
      <input
        type="checkbox"
        checked={completed.get()}
        onChange={(e) => completed.set(e.target.checked)}
      />
      <input
        value={text.get()}
        onChange={(e) => text.set(e.target.value)}
      />
    </div>
  )
}
```

#### Lazy Initialization

You can pass a function as the initial value for expensive computations:

```ts
function DataProcessor() {
  const expensiveData = useAtom('data', () => {
    // This function only runs once when the component mounts
    return processLargeDataset()
  })

  return <div>Processing {expensiveData.get().length} items</div>
}
```

#### Atom Options

You can customize atom behavior with options:

```ts
const user = useAtom(
	'user',
	{ id: 1, name: 'Alice' },
	{
		isEqual: (a, b) => a.id === b.id, // Only update if ID changes
	}
)
```

### useComputed: Component-Local Computed Values

**useComputed** creates computed signals that automatically track their dependencies and recalculate when needed.

#### Basic Computed Values

```ts
import { useAtom, useComputed } from '@tldraw/state-react'

function ShoppingCart() {
  const items = useAtom('items', [])
  const total = useComputed('total', () => {
    return items.get().reduce((sum, item) => sum + item.price, 0)
  }, [items])

  return <div>Total: ${total.get().toFixed(2)}</div>
}
```

#### Advanced Computed Options

You can provide options for custom equality checking and diff computation:

```ts
const optimizedData = useComputed(
	'processed',
	() => {
		return heavyProcessing(rawData.get())
	},
	{
		isEqual: (a, b) => a.checksum === b.checksum,
	},
	[rawData]
)
```

> Tip: Use computed values to avoid expensive recalculations. They only recalculate when their dependencies actually change.

## 3. Component Tracking

### track: Automatic Signal Tracking

The **track** higher-order component is the most convenient way to make React components reactive. It automatically tracks which signals your component accesses and re-renders when any of them change.

#### Basic Component Tracking

```ts
import { atom } from '@tldraw/state'
import { track } from '@tldraw/state-react'

const theme = atom('theme', 'light')
const userName = atom('userName', 'Guest')

const Header = track(function Header() {
  return (
    <header className={theme.get()}>
      Welcome, {userName.get()}!
    </header>
  )
})
```

Now whenever `theme` or `userName` changes, the `Header` component automatically re-renders.

#### Tracking with Props

Track works seamlessly with component props and React patterns:

```ts
interface UserCardProps {
  userId: string
}

const UserCard = track(function UserCard({ userId }: UserCardProps) {
  const user = useValue('user', () => getUserById(userId), [userId])

  return (
    <div>
      <h3>{user.name}</h3>
      <p>Email: {user.email}</p>
    </div>
  )
})
```

#### Tracking and React.memo

The `track` function automatically wraps your component in `React.memo`, so it only re-renders when props change or tracked signals change:

```ts
// This component only re-renders when:
// 1. The userId prop changes, OR
// 2. The signals accessed inside the component change
const OptimizedUserCard = track(function OptimizedUserCard({ userId }: UserCardProps) {
  const user = getUserAtom(userId) // Signal access is tracked
  return <div>{user.get().name}</div>
})
```

### useStateTracking: Manual Tracking

For more control, you can use **useStateTracking** to manually track signal dependencies in specific parts of your render function. It also accepts an optional dependency array, similar to `useMemo`, to control when the reactive tracking logic is re-created.

```ts
import { useStateTracking } from '@tldraw/state-react'

function CustomComponent() {
  const [regularState, setRegularState] = useState(0)

  const reactiveContent = useStateTracking('reactive-section', () => {
    // Only this part is reactive to signals
    return <div>Current theme: {theme.get()}</div>
  }, []) // deps array is optional

  return (
    <div>
      <button onClick={() => setRegularState(s => s + 1)}>
        Regular state: {regularState}
      </button>
      {reactiveContent}
    </div>
  )
}
```

> Tip: Use `useStateTracking` when you need fine-grained control over which parts of your component are reactive.

## 4. Side Effects and Reactions

Reading and displaying reactive state is only part of the story. The other part is performing **side effects** that respond to state changes - like updating the DOM, making network requests, or triggering animations.

### useReactor: Frame-Throttled Effects

**useReactor** runs side effects in response to signal changes, with updates throttled to animation frames for optimal performance:

```ts
import { useReactor } from '@tldraw/state-react'

function CanvasRenderer() {
  const shapes = useAtom('shapes', [])

  useReactor('canvas-update', () => {
    // This runs at most once per animation frame
    redrawCanvas(shapes.get())
  }, [shapes])

  return <canvas ref={canvasRef} />
}
```

The effect runs immediately when the component mounts, then again whenever `shapes` changes, but updates are batched to animation frames for smooth performance.

#### Visual Updates and Animations

Use `useReactor` for any visual updates or DOM manipulations:

```ts
function AnimatedCounter() {
  const count = useAtom('count', 0)
  const elementRef = useRef<HTMLDivElement>(null)

  useReactor('animate-color', () => {
    const element = elementRef.current
    if (element) {
      // Animate background color based on count
      element.style.backgroundColor = count.get() > 10 ? 'green' : 'blue'
    }
  }, [count])

  return (
    <div ref={elementRef}>
      <button onClick={() => count.set(count.get() + 1)}>
        Count: {count.get()}
      </button>
    </div>
  )
}
```

### useQuickReactor: Immediate Effects

**useQuickReactor** runs side effects immediately without throttling, perfect for critical updates that can't wait:

```ts
import { useQuickReactor } from '@tldraw/state-react'

function DataSynchronizer() {
  const criticalData = useAtom('criticalData', null)

  useQuickReactor('sync-data', () => {
    const data = criticalData.get()
    if (data) {
      // Send immediately - don't wait for next frame
      sendToServer(data)
    }
  }, [criticalData])

  return <div>Sync status updated</div>
}
```

#### When to Use Quick vs Throttled Effects

**Use `useReactor` (throttled) for:**

- Visual updates and animations
- DOM manipulations
- Canvas rendering
- UI state changes

**Use `useQuickReactor` (immediate) for:**

- Data synchronization
- Network requests
- Critical state updates
- Event logging

```ts
function ComprehensiveExample() {
  const userInput = useAtom('userInput', '')
  const selectedItems = useAtom('selectedItems', [])

  // Throttled: Visual feedback
  useReactor('visual-feedback', () => {
    updateHighlightedElements(selectedItems.get())
  }, [selectedItems])

  // Immediate: Data persistence
  useQuickReactor('save-draft', () => {
    saveDraft(userInput.get())
  }, [userInput])

  return (
    <div>
      <input onChange={(e) => userInput.set(e.target.value)} />
      {/* ... */}
    </div>
  )
}
```

## 5. Advanced Patterns

### Performance Optimization

While @tldraw/state-react is optimized by default, there are patterns for demanding applications.

#### Minimizing Re-renders with Selective Tracking

Use `track` strategically to only make components reactive when needed:

```ts
// Only the inner component is reactive
function UserDashboard({ userId }: Props) {
  return (
    <div>
      <StaticHeader />
      <UserContent userId={userId} />  {/* This is tracked */}
      <StaticFooter />
    </div>
  )
}

const UserContent = track(function UserContent({ userId }: Props) {
  const user = getUserSignal(userId)
  return <div>{user.get().name}</div>
})
```

#### Batching Updates with Multiple Signals

When you need to update multiple related signals, use transactions from @tldraw/state:

```ts
import { transact } from '@tldraw/state'

function BulkUpdater() {
  const firstName = useAtom('firstName', '')
  const lastName = useAtom('lastName', '')
  const email = useAtom('email', '')

  const updateUser = (userData: UserData) => {
    transact(() => {
      // All three updates happen atomically
      firstName.set(userData.firstName)
      lastName.set(userData.lastName)
      email.set(userData.email)
    })
    // Components re-render only once after all changes
  }

  return <button onClick={() => updateUser(newData)}>Update User</button>
}
```

### Integration with External State

#### Syncing with External Systems

You can use reactive effects to sync with external systems:

```ts
function LocalStorageSync() {
  const preferences = useAtom('preferences', {})

  // Save to localStorage when preferences change
  useQuickReactor('save-preferences', () => {
    localStorage.setItem('prefs', JSON.stringify(preferences.get()))
  }, [preferences])

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('prefs')
    if (saved) {
      preferences.set(JSON.parse(saved))
    }
  }, [])

  return <div>Preferences synced!</div>
}
```

#### WebSocket Integration

```ts
function RealtimeData() {
  const liveData = useAtom('liveData', {})

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080')

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      liveData.set(data)  // Updates trigger reactive re-renders
    }

    return () => ws.close()
  }, [])

  return <div>Live data: {JSON.stringify(liveData.get())}</div>
}
```

### Custom Hook Patterns

You can create custom hooks that combine multiple state-react hooks:

```ts
function useCounter(initialValue = 0) {
  const count = useAtom('count', initialValue)

  const increment = useCallback(() => count.update(n => n + 1), [count])
  const decrement = useCallback(() => count.update(n => n - 1), [count])
  const reset = useCallback(() => count.set(initialValue), [count, initialValue])

  return {
    count: count.get(),
    increment,
    decrement,
    reset
  }
}

// Usage
const CounterComponent = track(function CounterComponent() {
  const { count, increment, decrement, reset } = useCounter(10)

  return (
    <div>
      <span>{count}</span>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  )
})
```

## 6. Debugging and Development

Because @tldraw/state-react builds on the reactive signals from @tldraw/state, you get access to powerful debugging tools for understanding component behavior.

### Using whyAmIRunning

You can use `whyAmIRunning()` from @tldraw/state to debug why components are re-rendering:

```ts
import { whyAmIRunning } from '@tldraw/state'

const DebuggableComponent = track(function DebuggableComponent() {
  const userStatus = useValue(currentUser, user => user.status, [currentUser])
  const themeColor = useValue(appTheme, theme => theme.primaryColor, [appTheme])

  // Debug why this component is re-rendering
  if (process.env.NODE_ENV === 'development') {
    whyAmIRunning()
  }

  return (
    <div style={{ color: themeColor }}>
      Status: {userStatus}
    </div>
  )
})
```

When the component re-renders, you'll see output like:

```
TrackedComponent is executing because:
↳ Computed(user.status) changed
  ↳ Atom(currentUser) changed
```

### Debugging Reactive Effects

You can debug reactive effects by adding logging:

```ts
function DebuggableEffects() {
  const data = useAtom('data', [])

  useReactor('debug-data-changes', () => {
    console.log('Data changed:', data.get())
    console.log('Change triggered at:', new Date().toISOString())

    // Use whyAmIRunning to see what caused this effect
    if (process.env.NODE_ENV === 'development') {
      whyAmIRunning()
    }
  }, [data])

  return <div>Check console for debug info</div>
}
```

### Component Performance Monitoring

Track renders and signal accesses in development:

```ts
const MonitoredComponent = track(function MonitoredComponent({ userId }: Props) {
  if (process.env.NODE_ENV === 'development') {
    console.log('Component rendering for user:', userId)
  }

  const user = useValue('user', () => {
    console.log('Fetching user data...')
    return getUserById(userId)
  }, [userId])

  if (process.env.NODE_ENV === 'development') {
    console.log('User data:', user)
  }

  return <div>User: {user.name}</div>
})
```

### React DevTools Integration

@tldraw/state-react works seamlessly with React DevTools:

- Components wrapped with `track` appear as "Memo(ComponentName)"
- Signal updates trigger normal React re-render detection
- Props changes are tracked separately from signal changes
- Use React DevTools Profiler to identify performance bottlenecks

> Tip: Enable "Highlight when components render" in React DevTools to see which components re-render when signals change.

## 7. Best Practices and Patterns

### Component Organization

Structure your reactive components for maintainability:

```ts
// ❌ Avoid: Large components with mixed concerns
const MonolithicComponent = track(function MonolithicComponent() {
  const user = useAtom('user', {})
  const posts = useAtom('posts', [])
  const comments = useAtom('comments', [])
  const theme = useAtom('theme', 'light')

  // 100+ lines of mixed logic...
})

// ✅ Better: Split into focused components
const UserProfile = track(function UserProfile() {
  const user = useAtom('user', {})
  return <UserInfo user={user.get()} />
})

const PostsList = track(function PostsList() {
  const posts = useAtom('posts', [])
  return <PostList posts={posts.get()} />
})
```

### Signal Naming Conventions

Use consistent naming for clarity:

```ts
// ✅ Good: Descriptive names with context
const currentUser = useAtom('currentUser', null)
const selectedShapes = useAtom('selectedShapes', [])
const editorMode = useAtom('editorMode', 'select')

// ❌ Avoid: Generic names without context
const data = useAtom('data', null)
const state = useAtom('state', {})
const items = useAtom('items', [])
```

### Effect Organization

Keep effects focused and well-named:

```ts
function WellOrganizedComponent() {
  const shapes = useAtom('shapes', [])
  const camera = useAtom('camera', { x: 0, y: 0, z: 1 })

  // Visual updates - throttled
  useReactor('update-viewport', () => {
    updateViewportTransform(camera.get())
  }, [camera])

  useReactor('render-shapes', () => {
    renderShapes(shapes.get())
  }, [shapes])

  // Data persistence - immediate
  useQuickReactor('save-document', () => {
    saveDocument({ shapes: shapes.get(), camera: camera.get() })
  }, [shapes, camera])

  return <canvas />
}
```

### Error Handling

Handle errors gracefully in reactive code:

```ts
const SafeDataComponent = track(function SafeDataComponent() {
  const [error, setError] = useState(null)

  const userData = useValue('userData', () => {
    try {
      return processUserData(rawUserData.get())
    } catch (err) {
      setError(err)
      return null
    }
  }, [rawUserData])

  if (error) {
    return <ErrorMessage error={error} />
  }

  return <UserDisplay data={userData} />
})
```

### Testing Reactive Components

Test reactive components by testing signal changes:

```ts
import { render, act } from '@testing-library/react'
import { atom } from '@tldraw/state'

test('component updates when signal changes', () => {
  const nameSignal = atom('name', 'Initial')

  const TestComponent = track(function TestComponent() {
    return <div data-testid="name">{nameSignal.get()}</div>
  })

  const { getByTestId } = render(<TestComponent />)

  expect(getByTestId('name')).toHaveTextContent('Initial')

  act(() => {
    nameSignal.set('Updated')
  })

  expect(getByTestId('name')).toHaveTextContent('Updated')
})
```

## 8. Integration with @tldraw/state

@tldraw/state-react is designed to work seamlessly with the core @tldraw/state library. You can use all the features of @tldraw/state within React components.

### Using Atoms and Computed Values

```ts
import { atom, computed } from '@tldraw/state'
import { track, useValue } from '@tldraw/state-react'

// Create signals outside of components for global state
const firstName = atom('firstName', 'John')
const lastName = atom('lastName', 'Doe')
const fullName = computed('fullName', () => `${firstName.get()} ${lastName.get()}`)

const UserGreeting = track(function UserGreeting() {
  // Access global signals in components
  const name = fullName.get()
  return <h1>Hello, {name}!</h1>
})
```

### Transactions and Batching

Use transactions to batch multiple updates:

```ts
import { transact } from '@tldraw/state'

function BatchedUpdates() {
  const user = useAtom('user', { name: '', email: '' })

  const updateUser = (newData: UserData) => {
    transact(() => {
      // Multiple updates happen atomically
      user.update(current => ({ ...current, name: newData.name }))
      user.update(current => ({ ...current, email: newData.email }))
    })
    // Component only re-renders once after both changes
  }

  return <button onClick={() => updateUser(formData)}>Update</button>
}
```

### History and Time Travel

Access signal history for undo/redo functionality:

```ts
import { atom } from '@tldraw/state'
import { useAtom } from '@tldraw/state-react'

function UndoableEditor() {
  // Create an atom with history enabled
  const content = useAtom('content', '', { historyLength: 10 })

  const undo = () => {
    // The history is stored on the atom and can be accessed
    // to implement undo/redo functionality. The exact implementation
    // depends on your diff format and how you use the history API
    // from @tldraw/state.
    // e.g. `const diffs = content.getDiffSince(someEpoch)`
    console.log('Undo clicked. See @tldraw/state docs for implementation.')
  }

  return (
    <div>
      <textarea
        value={content.get()}
        onChange={(e) => content.set(e.target.value)}
      />
      <button onClick={undo}>Undo</button>
    </div>
  )
}
```

> Tip: See the [@tldraw/state documentation](../state/DOCS.md) for complete details on transactions, history, and advanced signal features.

This powerful combination of @tldraw/state and @tldraw/state-react gives you a complete reactive state solution that scales from simple components to complex applications like the tldraw editor itself.
