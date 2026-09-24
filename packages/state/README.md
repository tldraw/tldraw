# @tldraw/state

`@tldraw/state` is a powerful and lightweight TypeScript library for managing reactive state using signals. It provides fine-grained reactive primitives that automatically track dependencies and efficiently update only what needs to change.

`@tldraw/state` powers the reactive system at the heart of [tldraw](https://www.tldraw.com), handling everything from canvas updates to collaborative state synchronization. It's designed to work seamlessly with [@tldraw/store](https://github.com/tldraw/tldraw/tree/main/packages/store) and has optional [React bindings](https://github.com/tldraw/tldraw/tree/main/packages/state-react).

## Documentation

Documentation for the most recent release can be found on [tldraw.dev/docs](https://tldraw.dev/docs), including [reference docs](https://tldraw.dev/reference/editor/Editor). Our release notes can be found [here](https://tldraw.dev/releases).

For more agent-friendly docs, see our [LLMs.txt](https://tldraw.dev/llms.txt).

A `DOCS.md` file is included alongside this README in the published package, with detailed API documentation and usage examples.

## Why @tldraw/state?

- **Fine-grained reactivity** - Only re-runs computations when their actual dependencies change
- **High performance** - Lazy evaluation and efficient dependency tracking
- **Automatic updates** - Derived values and side effects update automatically
- **Incremental updates** - Built-in diff history and transactions with rollback support
- **Framework agnostic** - Works with any JavaScript framework or vanilla JS
- **TypeScript first** - Excellent type safety with full TypeScript support

Perfect for building reactive UIs, real-time collaborative apps, and complex state machines where performance and predictability matter.

## Installation

```bash
npm install @tldraw/state
```

## Quick start

```ts
import { atom, computed, react } from '@tldraw/state'

// Create reactive state
const name = atom('name', 'World')
const count = atom('count', 0)

// Derive values automatically
const greeting = computed('greeting', () => {
	return `Hello, ${name.get()}! Count: ${count.get()}`
})

// React to changes
react('logger', () => {
	console.log(greeting.get())
})
// Logs: "Hello, World! Count: 0"

// Update state - reactions run automatically
name.set('tldraw')
// Logs: "Hello, tldraw! Count: 0"

count.set(42)
// Logs: "Hello, tldraw! Count: 42"
```

## Core concepts

### Atoms - state containers

Atoms hold raw values and are the foundation of your reactive state:

```ts
import { atom } from '@tldraw/state'

// Create atoms with initial values
const user = atom('user', { name: 'Alice', age: 30 })
const theme = atom('theme', 'light')

// Read values
console.log(user.get().name) // 'Alice'

// Update values
user.update((current) => ({ ...current, age: 31 }))
theme.set('dark')
```

### Computed values - automatic derivation

Computed signals derive their values from other signals and update automatically:

```ts
import { computed } from '@tldraw/state'

const firstName = atom('firstName', 'John')
const lastName = atom('lastName', 'Doe')

const fullName = computed('fullName', () => {
	return `${firstName.get()} ${lastName.get()}`
})

console.log(fullName.get()) // "John Doe"

firstName.set('Jane')
console.log(fullName.get()) // "Jane Doe" - automatically updated!
```

### Reactions - side effects

Reactions run side effects when their dependencies change:

```ts
import { react } from '@tldraw/state'

const selectedId = atom('selectedId', null)

// Update UI when selection changes
const stop = react('update-selection-ui', () => {
	const id = selectedId.get()
	document.getElementById('selected').textContent = id || 'None'
})

selectedId.set('shape-123')
// UI automatically updates

// Clean up when no longer needed
stop()
```

### Transactions - batched updates

Batch multiple updates to prevent intermediate reactions:

```ts
import { transact } from '@tldraw/state'

const x = atom('x', 0)
const y = atom('y', 0)

const position = computed('position', () => `(${x.get()}, ${y.get()})`)

react('log-position', () => console.log(position.get()))
// Logs: "(0, 0)"

transact(() => {
	x.set(10)
	y.set(20)
	// Reaction runs only once after transaction
})
// Logs: "(10, 20)"
```

## Advanced features

### History and diffs

Track changes over time so that dependents can update incrementally instead of recomputing from scratch:

```ts
const canvas = atom(
	'canvas',
	{ shapes: [] },
	{
		historyLength: 100,
		computeDiff: (prev, next) => ({ prev, next }),
	}
)

// Remember where you are...
const startEpoch = canvas.lastChangedEpoch

// ... make changes ...
canvas.update((state) => ({ shapes: [...state.shapes, newShape] }))

// ... and get the diffs since then (or RESET_VALUE if the history doesn't reach back that far)
const diffs = canvas.getDiffSince(startEpoch)
```

### Performance optimization

Use `unsafe__withoutCapture` to read values without creating dependencies:

```ts
const expensiveComputed = computed('expensive', () => {
	const important = importantValue.get()

	// Read this without making it a dependency
	const metadata = unsafe__withoutCapture(() => metadataAtom.get())

	return computeExpensiveValue(important, metadata)
})
```

### Debugging

Use `whyAmIRunning()` to understand what triggered an update:

```ts
react('debug-reaction', () => {
	whyAmIRunning() // Logs dependency tree to console
	// Your reaction code...
})
```

## Integration examples

### With tldraw SDK

```ts
// e.g. in Tldraw's onMount callback, which receives the editor
const selectedShapes = computed('selectedShapes', () => {
	return editor.getSelectedShapeIds().map((id) => editor.getShape(id))
})

// React to selection changes; call the returned function to stop
const stop = react('update-property-panel', () => {
	const shapes = selectedShapes.get()
	updatePropertyPanel(shapes)
})
```

### With React

Install the React bindings:

```bash
npm install @tldraw/state-react
```

```tsx
import { track, useAtom, useComputed } from '@tldraw/state-react'

// track() re-renders the component when any signal it reads changes
const Counter = track(function Counter() {
	const count = useAtom('count', 0)
	const doubled = useComputed('doubled', () => count.get() * 2, [count])

	return (
		<div>
			<p>Count: {count.get()}</p>
			<p>Doubled: {doubled.get()}</p>
			<button onClick={() => count.set(count.get() + 1)}>+</button>
		</div>
	)
})
```

## API reference

For complete API documentation, see [DOCS.md](./DOCS.md).

### Core functions

- `atom(name, initialValue, options?)` - Create a reactive state container
- `computed(name, computeFn, options?)` - Create a derived value
- `react(name, effectFn, options?)` - Create a side effect
- `transact(fn)` - Batch state updates

### Class-based APIs

- `@computed` - Decorator for computed class properties

### Advanced

- `reactor(name, effectFn)` - Create a controllable reaction
- `unsafe__withoutCapture(fn)` - Read state without creating dependencies
- `whyAmIRunning()` - Debug what triggered an update
- `getComputedInstance(obj, prop)` - Get underlying computed instance
- `signal.getDiffSince(epoch)` - Get the diffs recorded since an epoch (see `signal.lastChangedEpoch`)

## Related packages

- **[@tldraw/state-react](../state-react)** - React bindings for @tldraw/state
- **[@tldraw/store](../store)** - Record storage built on @tldraw/state
- **[@tldraw/editor](../editor)** - The tldraw canvas editor
- **[@tldraw/tldraw](../tldraw)** - Complete tldraw UI components

## Examples & patterns

Looking for more examples? Check out:

- [tldraw SDK examples](https://github.com/tldraw/tldraw/tree/main/apps/examples) - Real-world usage in tldraw applications

## Contributing

Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## License

This project is licensed under the MIT License found [here](https://github.com/tldraw/tldraw/blob/main/packages/state/LICENSE.md). The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw). You can contact us by email at [hello@tldraw.com](mailto:hello@tldraw.com).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).
