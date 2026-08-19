/**
 * The number of items an ArraySet holds in array mode before switching to a Set.
 * Exported only for tests.
 * @internal
 */
export const ARRAY_SIZE_THRESHOLD = 8

/**
 * An ArraySet operates as an array until it reaches a certain size, after which a Set is used
 * instead. In either case, the same methods are used to get, set, remove, and visit the items.
 *
 * `set` and `array` are never both non-null. `set` being null means array mode, but the array
 * itself is only allocated on the first `add` (most signals never get a child, and an empty
 * ArraySet is created for every atom and effect, and two for every computed), so array-mode code
 * must handle `array === null`; `arraySize` is 0 in that state. Once promoted to a set, an
 * ArraySet never goes back.
 * @internal
 */
export class ArraySet<T> {
	private set: Set<T> | null = null

	// Slots [0, arraySize) hold the items; slots beyond are undefined. `add`/`has` scan the whole
	// array with indexOf, which is why `clear` and `remove` must blank vacated slots.
	private array: (T | undefined)[] | null = null

	private arraySize = 0

	/**
	 * Get whether this ArraySet has any elements.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get isEmpty() {
		if (this.set) {
			return this.set.size === 0
		}

		return this.arraySize === 0
	}

	/**
	 * Add an element to the ArraySet if it is not already present.
	 *
	 * @returns `true` if the element was added, `false` if it was already present
	 */
	add(elem: T) {
		if (this.set) {
			if (this.set.has(elem)) {
				return false
			}

			this.set.add(elem)
			return true
		}

		if (!this.array) {
			this.array = Array(ARRAY_SIZE_THRESHOLD)
		} else if (this.array.indexOf(elem) !== -1) {
			return false
		}

		if (this.arraySize < ARRAY_SIZE_THRESHOLD) {
			this.array[this.arraySize] = elem
			this.arraySize++

			return true
		}

		// The array is full: promote to a set.
		this.set = new Set(this.array as T[])
		this.set.add(elem)
		this.array = null
		this.arraySize = 0

		return true
	}

	/**
	 * Remove an element from the ArraySet if it is present.
	 *
	 * @returns `true` if the element was removed, `false` if it was not present
	 */
	remove(elem: T) {
		if (this.set) {
			return this.set.delete(elem)
		}

		if (!this.array) {
			return false
		}

		const idx = this.array.indexOf(elem)

		if (idx === -1) {
			return false
		}

		this.arraySize--

		// Move the last item into the vacated slot so the items stay dense.
		this.array[idx] = this.array[this.arraySize]
		this.array[this.arraySize] = undefined

		return true
	}

	/**
	 * Execute a callback function for each element in the ArraySet.
	 */
	visit(visitor: (item: T) => void) {
		if (this.set) {
			this.set.forEach(visitor)

			return
		}

		if (!this.array) {
			return
		}

		for (let i = 0; i < this.arraySize; i++) {
			visitor(this.array[i]!)
		}
	}

	/**
	 * Make the ArraySet iterable, allowing it to be used in for...of loops and with spread syntax.
	 */
	*[Symbol.iterator]() {
		if (this.set) {
			yield* this.set
		} else if (this.array) {
			for (let i = 0; i < this.arraySize; i++) {
				yield this.array[i]!
			}
		}
	}

	/**
	 * Check whether an element is present in the ArraySet.
	 */
	has(elem: T) {
		if (this.set) {
			return this.set.has(elem)
		}

		return this.array ? this.array.indexOf(elem) !== -1 : false
	}

	/**
	 * Remove all elements from the ArraySet.
	 */
	clear() {
		if (this.set) {
			this.set.clear()
		} else if (this.array) {
			// Blank the used slots in place rather than allocating a new array: this runs on every
			// computed derive and effect run.
			this.array.fill(undefined, 0, this.arraySize)
			this.arraySize = 0
		}
	}

	/**
	 * Get the number of elements in the ArraySet.
	 */
	size() {
		if (this.set) {
			return this.set.size
		}

		return this.arraySize
	}
}
