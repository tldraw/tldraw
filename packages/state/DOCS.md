# @tldraw/state Documentation

## 1. Introduction

### What is @tldraw/state?

@tldraw/state is a powerful and lightweight TypeScript library for managing state using reactive values called **signals**. Its fine-grained reactive system allows you to build complex, performant, and predictable user interfaces and data models.

This library provides the core of tldraw's reactivity system. Its sister library, @tldraw/state-react, provides bindings for [React](https://react.dev/).

### Installation

```bash
npm install @tldraw/state
```

### TypeScript

@tldraw/state is written in TypeScript and provides excellent type safety out of the box. No additional types package needed.

### Quick Example

Here's a simple example to show how tldraw state works:

```ts
import { atom, computed, react } from '@tldraw/state'

// Create some state
const name = atom('name', 'World')
const greeting = computed('greeting', () => `Hello, ${name.get()}!`)

// React to changes
react('update page title', () => {
	window.alert(greeting.get())
})

// Update the state
name.set('tldraw state')
// Page title automatically updates to "Hello, tldraw state!"
```

In just a few lines, you've created reactive state that automatically alerts the user when it changes.

## 2. Signals

A **signal** is a reactive container for a value that can change over time.

In @tldraw/state, there are two types of signals:

- An **Atom** is the basic type of signal that acts as a container for a single value.
- A **Computed** is a signal that derives its value from several other signals (atoms or other computeds).

### Atoms: The State Containers

Atoms are the foundation of your application's state. They contain "raw" values that the rest of your application will use and react to.

#### Creating Atoms

You create an atom using the atom function. You must give it a name and an initial value.

```ts
import { atom } from '@tldraw/state'

const count = atom('count', 0)
const user = atom('user', { name: 'Alice', age: 30 })
```

> Tip: The name is used for debugging purposes, specifically for the `whyAmIRunning` function described later in these docs.

#### Reading an Atom's Value

To get the current value of an atom, use its `.get()` method.

```ts
console.log(count.get()) // 0
console.log(user.get().name) // 'Alice'
```

> Tip: When you call `.get()` inside the function body of computed or a reaction, the library automatically **captures** that signal as a dependency.

#### Updating an Atom's Value

You can change an atom's value in two ways:

1. `.set(newValue)`: Directly sets the atom to a new value.

```ts
count.set(1)
console.log(count.get()) // 1
```

2. `.update(updaterFn)`: Takes a function that receives the current value and returns the new value. This is useful when the new state depends on the old one.

```ts
count.update((currentValue) => currentValue + 1)
console.log(count.get()) // 2
```

> Tip: If you try to set an atom to a value that is equal to its current value, the update will be skipped, and no reactions will be triggered.

#### Atom Options

You can pass an options object as the third argument to atom to customize its behavior.

- `isEqual`: A function to compare the old and new values to determine if the atom has changed. This is useful for complex objects.

```ts
// This atom will only update if the 'id' property changes.
const activeUser = atom('activeUser', { id: 1, name: 'Bob' }, { isEqual: (a, b) => a.id === b.id })

// This will NOT trigger an update because the IDs are the same.
activeUser.set({ id: 1, name: 'Robert' })
```

- `historyLength` & `computeDiff`: These options are used for tracking changes over time. See the "History and Diffs" section for more details.

### Computeds: The Derived Values

A Computed is a signal whose value is derived from other signals. You can use computed signals to create complex data models that automatically stay in sync.

#### Creating Computeds

You create a computed signal using the `computed` function. It takes a name and a function that calculates its value. Inside this function, you can `.get()` the value of other signals.

```ts
import { atom, computed } from '@tldraw/state'

const firstName = atom('firstName', 'John')
const lastName = atom('lastName', 'Doe')

const fullName = computed('fullName', (prevValue) => {
	return `${firstName.get()} ${lastName.get()}`
})

console.log(fullName.get()) // "John Doe"

// Now, if we change a dependency...
firstName.set('Jane')

// ...the computed signal automatically updates!
console.log(fullName.get()) // "Jane Doe"
```

Note that computed signals capture both atoms and other computed signals as dependencies. Following the example above, if we create a new computed signal that depends on `fullName`, it will automatically update when `fullName` changes.

```ts
const greeting = computed('greeting', (prevValue) => {
	return `Hello, ${fullName.get()}!`
})

firstName.set('Sam')

console.log(greeting.get()) // "Hello, Sam Doe!"
```

#### Dependency Capture

This automatic dependency tracking works through a process called **dependency capture**. When the `fullName` function runs, the library actively "listens" for any calls to `.get()`. Each signal that is "gotten" is automatically registered as a dependency of `fullName`. The list of dependencies is updated every time the function re-runs, so they can even change dynamically.

#### Lazy Evaluation

Computed signals are evaluated **lazily**. The calculation function only runs when you call `.get()` on the computed _and_ one of its captured signal dependencies has changed since the last time it was gotten. If nothing has changed, the computed returns its previous cached value.

#### Using `@computed` as a Decorator

For classes, you can use the `@computed` decorator to create a computed property from a getter method. This is a clean way to co-locate derived data with its related state.

```ts
class User {
	firstName = atom('firstName', 'John')
	lastName = atom('lastName', 'Doe')

	@computed
	getFullName() {
		return `${this.firstName.get()} ${this.lastName.get()}`
	}
}

const user = new User()
console.log(user.getFullName()) // "John Doe"

user.firstName.set('Jane')
console.log(user.getFullName()) // "Jane Doe"
```

If you need to access the underlying computed instance for a computed property created with the `@computed` decorator, you can use the `getComputedInstance` function.

```ts
const user = new User()
const fullNameComputed = getComputedInstance(user, 'getFullName')
console.log(fullNameComputed.get()) // "John Doe"
```

## 3. Reactivity and Side Effects

Reading and deriving state is only half the story. The other half is performing actions, called _side effects_, that run when state changes. Side effects can be used for anything: updating the DOM, logging to the console, making a network request, and so on.

### Simple Reactions with `react`

The easiest way to create a side effect is with the `react` function. You give it a name and a function to run. The library automatically **captures** which signals the function `.get()`s as dependencies and will re-run it whenever any of them change.

When created, `react` will immediate run your function once. It returns a `stop` function that you can call to tear down the reaction and stop it from listening to changes.

```ts
import { atom, react } from '@tldraw/state'

const color = atom('color', 'red')

const stop = react('Update document title', () => {
	document.title = `The color is ${color.get()}`
})

// The title is now "The color is red"

color.set('blue')
// The title is now "The color is blue"

// To clean up the effect:
stop()

color.set('green')
// The title remains "The color is blue"
```

> Tip: The stop function is perfect for "fire-and-forget" effects, especially within UI components (e.g., in a useEffect hook in React).

### Controlled Reactions with `reactor`

For more control over the lifecycle of an effect, you can use `reactor`. It's similar to `react` but it doesn't start automatically. Instead, it returns a Reactor object with `.start()` and `.stop()` methods.

```ts
import { atom, reactor } from '@tldraw/state'

const name = atom('name', 'world')

const greeter = reactor('Greeter', () => {
	console.log(`Hello, ${name.get()}!`)
})

// Nothing has been logged yet.

greeter.start()
// Logs: "Hello, world!"

name.set('galaxy')
// Logs: "Hello, galaxy!"

greeter.stop()

name.set('universe')
// Nothing is logged.
```

> Tip: A reactor is useful when you have a long-lived effect that needs to be paused and resumed based on application logic.

## 4. Advanced Topics

### Transactions: Batching State Updates

When you update multiple atoms that are dependencies of the same reaction, you might cause the reaction to re-run multiple times. transacts solve this by batching all state changes into a single, atomic update, after which reactions will execute.

#### Using transact()

The `transact` function takes a callback. All state updates inside this callback are queued. Reactions are only triggered _after_ the callback has finished executing successfully.

```ts
const firstName = atom('firstName', 'John')
const lastName = atom('lastName', 'Doe')

react('greet', () => {
	console.log(`Hello, ${firstName.get()} ${lastName.get()}!`)
})
// Logs: "Hello, John Doe!"

transact(() => {
	// These two updates will be batched.
	firstName.set('Jane')
	lastName.set('Smith')
	// The reaction has NOT run yet.
})

// NOW the reaction runs.
// Logs: "Hello, Jane Smith!"
```

#### Aborting and Rolling Back

Transactions may be aborted. Aborting a transaction will restore previous values of all signals modified inside of the transaction.

Rollbacks also occur automatically if an error is thrown inside the transaction.

```ts
const name = atom('name', 'Alice')

try {
	transact((rollback) => {
		name.set('Bob')
		throw new Error('Something went wrong')
	})
} catch (e) {
	// The transaction was aborted.
}

console.log(name.get()) // "Alice"
```

You can also abort a transaction manually by calling the `rollback` function, which is passed to the transaction callback.

```ts
const name = atom('name', 'Alice')

transact((rollback) => {
	name.set('Bob')
	rollback() // Discard the change
})

console.log(name.get()) // "Alice"
```

Aborting a transaction will _only_ restore the values of the signals that were modified inside of the transaction. Other types of data or parts of your application will not be affected.

#### Nested Transactions

You can call `transact` inside of another transaction. A new transaction will only be created if there is not already one in progress.

If you want to create nested transactions (in order to take advantage of the rollback functionality), you can use the `transaction` function instead of `transact`.

```ts
transact(() => {
	firstName.set('Jane')

	transaction((rollback) => {
		try {
			lastName.set('Smith')
			throw new Error('Something went wrong')
		} catch (e) {
			rollback()
		}
	})
})

console.log(firstName.get()) // "Jane"
console.log(lastName.get()) // "Doe" // The change was rolled back
```

### History and Diffs

@tldraw/state can automatically track the history of changes to a signal, which is invaluable for features like undo/redo or creating sync engines.

To enable history, you must provide the `historyLength` option when creating an atom or computed.

```ts
const count = atom('count', 0, {
	historyLength: 10,
	// You can also provide a function to compute the difference (diff)
	computeDiff: (a, b) => b - a,
})
```

The `historyLength` option defines the maximum number of diffs to keep in the history buffer. If you expect the atom to be part of an active effect subscription all the time, and to not change multiple times inside of a single transaction, you can set this to a relatively low number (e.g. 10). Otherwise, set this to a higher number based on your usage pattern and memory constraints.

#### Retrieving Diffs

Once history is enabled, you can use `getDiffSince(epoch)` to get an array of diffs that occurred since a specific point in time.

```ts
import { getGlobalEpoch } from '@tldraw/state'

const startEpoch = getGlobalEpoch()

count.set(5) // diff is 5
count.set(12) // diff is 7

const diffs = count.getDiffSince(startEpoch)
console.log(diffs) // [5, 7]
```

If the library doesn't have enough history to compute the diffs, it will return the special `RESET_VALUE` symbol. This tells you that you need to re-compute the state from scratch instead of applying patches.

### Computed Options

Similar to atoms, you can provide a `ComputedOptions` object as the second argument to the `computed` function.

```ts
const fullName = computed('fullName', () => {
	return (`${firstName.get()} ${lastName.get()}`, { isEqual: (a, b) => a === b })
})
```

You also can pass in a `ComputedOptions` when used the `@computed` decorator.

```ts
class Counter {
	max = 100
	count = atom<number>(0)

	@computed({ isEqual: (a, b) => a === b })
	get remaining() {
		return this.max - this.count.get()
	}
}
```

### Incremental Computation

Computed signals can take advantage of diffs to compute a value incrementally.

In addition to the options described for atoms, you can also provide a `computeDiff` function. This function is used to compute the diff between the previous and new values of the computed signal.

```ts
const count = atom('count', 0)
const double = computed(
	'double',
	(prevValue) => {
		return count.get() * 2
	},
	{ computeDiff: (a, b) => b - a }
)
```

You can use the `withDiff` helper to wrap the return value of a computed signal function, indicating that the diff should be used instead of calculating a new one with `AtomOptions.computeDiff`.

```ts
const count = atom('count', 0)
const double = computed('double', (prevValue) => {
	const nextValue = count.get() * 2
	if (isUninitialized(prevValue)) {
		return nextValue
	}
	return withDiff(nextValue, nextValue - prevValue)
})
```

#### Handling the First Computed Run

Sometimes you need to know if a computed function is running for the very first time. The function is called with the previous value, which will be the special symbol `UNINITIALIZED` on the first run. You can check for this using the `isUninitialized` helper. This is particularly useful for incremental computations.

```ts
import { isUninitialized } from '@tldraw/state'

const list = computed('list', (prevValue) => {
	if (isUninitialized(prevValue)) {
		console.log('Calculating list for the first time!')
		// ... perform expensive initial calculation
	} else {
		// ... perform cheaper incremental update
	}
	// ...
})
```

### Using the EffectScheduler

Under the hood, both `react` and `reactor` are powered by the `EffectScheduler`. You can use this low-level API for advanced use cases, like batching multiple effects together to run in the next animation frame.

You can provide a `scheduleEffect` function in the options. This function receives the execute callback, and it's up to you to decide when to call it.

```ts
let isRafScheduled = false
const scheduledEffects = []

const scheduleEffect = (execute) => {
	scheduledEffects.push(execute)
	if (!isRafScheduled) {
		isRafScheduled = true
		requestAnimationFrame(() => {
			isRafScheduled = false
			// Run all batched effects
			scheduledEffects.forEach((fn) => fn())
			scheduledEffects.length = 0
		})
	}
}

const stop = react(
	'Update DOM batched',
	() => {
		/* ... update the DOM ... */
	},
	{ scheduleEffect }
)
```

### Performance Optimization

While @tldraw/state is fast by default, there are tools for fine-tuning performance in demanding situations.

#### unsafe\_\_withoutCapture()

As explained earlier, when a computed or reaction runs, it automatically captures any signals you `.get()` as dependencies. Sometimes, however, you need to read a signal's value _without_ creating this dependency. `unsafe__withoutCapture` lets you step out of the current capture phase to do exactly that.

```ts
const frequentlyChangingValue = atom('frequent', 0)
const importantValue = atom('important', 'A')

react('log important changes', () => {
	console.log(`Important value changed to ${importantValue.get()}`)

	// We read this value, but don't create a dependency on it.
	const otherValue = unsafe__withoutCapture(() => frequentlyChangingValue.get())
	console.log(`(The other value was ${otherValue} at the time)`)
})

// This will NOT re-run the reaction.
frequentlyChangingValue.set(1)
```

### Type Guards and Utilities

The library exports several type guard functions to help you work with signals in TypeScript.

- `isSignal(value)`: Returns true if the value is an atom or a computed.
- `isAtom(value)`: Returns true if the value is an atom.
- `isComputed(value)`: Returns true if the value is a computed.

## 5. Debugging

Because @tldraw/state manages a graph of dependencies, it can sometimes be tricky to understand why a particular reaction or computed signal is re-running. The library provides a powerful utility to help with this.

### whyAmIRunning()

If you're ever confused about what caused an effect to run, you can call `whyAmIRunning()` at the beginning of its function. It will log a detailed, hierarchical tree to the console, showing you exactly which atom(s) changed and triggered the update.

```ts
import { atom, computed, react, whyAmIRunning } from '@tldraw/state'

const name = atom('name', 'Bob')
const age = atom('age', 42)

const greeting = computed('greeting', () => {
	// We don't need to debug this one.
	return `Hello, ${name.get()}`
})

react('log details', () => {
	// But we want to know why this reaction runs.
	whyAmIRunning()

	console.log(`${greeting.get()} is ${age.get()} years old.`)
})

// On the first run, it logs:
// Effect(log details) was executed manually.

age.set(43)

// When age is updated, it logs:
// Effect(log details) is executing because:
// ↳ Atom(age) changed

name.set('Alice')

// When name is updated, it logs:
// Effect(log details) is executing because:
// ↳ Computed(greeting) changed
// ↳ Atom(name) changed
```

This makes it much easier to trace the flow of data and updates through your application.

## 6. Integrations with React

In addition to the core library, @tldraw/state provides a separate package, @tldraw/state-react, for integrating with the React framework. This library is documented separately.
