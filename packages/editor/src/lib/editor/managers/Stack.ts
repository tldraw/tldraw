import { EMPTY_ARRAY } from '@tldraw/state'

export type Stack<T> = StackItem | EmptyStackItem

export function stack<T>(items?: Array): Stack {
	if (items) {
		let result = EMPTY_STACK_ITEM as Stack
		while (items.length) {
			result = result.push(items.pop()!)
		}
		return result
	}
	return EMPTY_STACK_ITEM as any
}

class EmptyStackItem<T> implements Iterable {
	readonly length = 0
	readonly head = null
	readonly tail: Stack = this

	push(head: T): Stack {
		return new StackItem<T>(head, this)
	}

	toArray() {
		return EMPTY_ARRAY
	}

	[Symbol.iterator]() {
		return {
			next() {
				return { value: undefined, done: true as const }
			},
		}
	}
}

const EMPTY_STACK_ITEM = new EmptyStackItem()

class StackItem<T> implements Iterable {
	length: number
	constructor(public readonly head: T, public readonly tail: Stack) {
		this.length = tail.length + 1
	}

	push(head: T): Stack {
		return new StackItem(head, this)
	}

	toArray() {
		return Array.from(this)
	}

	[Symbol.iterator]() {
		let stack = this as Stack
		return {
			next() {
				if (stack.length) {
					const value = stack.head!
					stack = stack.tail
					return { value, done: false as const }
				} else {
					return { value: undefined, done: true as const }
				}
			},
		}
	}
}
