// The maximum size for an array in an ArraySet
export const ARRAY_SIZE_THRESHOLD = 8

/**
 * An ArraySet operates as an array until it reaches a certain size, after which a Set is used
 * instead. In either case, the same methods are used to get, set, remove, and visit the items.
 * @internal
 */
export class ArraySet<T> {
	private arraySize = 0

	private array: (T | undefined)[] | null = Array(ARRAY_SIZE_THRESHOLD)

	private set: Set<T> | null = null

	/**
	 * Get whether this ArraySet has any elements.
	 *
	 * @returns True if this ArraySet has any elements, false otherwise.
	 */
	// eslint-disable-next-line no-restricted-syntax
	get isEmpty() {
		if (this.array) {
			return this.arraySize === 0
		}

		if (this.set) {
			return this.set.size === 0
		}

		throw new Error('no set or array')
	}

	/**
	 * Add an item to the ArraySet if it is not already present.
	 *
	 * @param elem - The element to add.
	 */

	add(elem: T) {
		if (this.array) {
			const idx = this.array.indexOf(elem)

			// Return false if the element is already in the array.
			if (idx !== -1) {
				return false
			}

			if (this.arraySize < ARRAY_SIZE_THRESHOLD) {
				// If the array is below the size threshold, push items into the array.

				// Insert the element into the array's next available slot.
				this.array[this.arraySize] = elem
				this.arraySize++

				return true
			} else {
				// If the array is full, convert it to a set and remove the array.
				this.set = new Set(this.array as any)
				this.array = null
				this.set.add(elem)

				return true
			}
		}

		if (this.set) {
			// Return false if the element is already in the set.
			if (this.set.has(elem)) {
				return false
			}

			this.set.add(elem)
			return true
		}

		throw new Error('no set or array')
	}

	/**
	 * Remove an item from the ArraySet if it is present.
	 *
	 * @param elem - The element to remove
	 */
	remove(elem: T) {
		if (this.array) {
			const idx = this.array.indexOf(elem)

			// If the item is not in the array, return false.
			if (idx === -1) {
				return false
			}

			this.array[idx] = undefined
			this.arraySize--

			if (idx !== this.arraySize) {
				// If the item is not the last item in the array, move the last item into the
				// removed item's slot.
				this.array[idx] = this.array[this.arraySize]
				this.array[this.arraySize] = undefined
			}

			return true
		}

		if (this.set) {
			// If the item is not in the set, return false.
			if (!this.set.has(elem)) {
				return false
			}

			this.set.delete(elem)

			return true
		}

		throw new Error('no set or array')
	}

	/**
	 * Run a callback for each element in the ArraySet.
	 *
	 * @param visitor - The callback to run for each element.
	 */
	visit(visitor: (item: T) => void) {
		if (this.array) {
			for (let i = 0; i < this.arraySize; i++) {
				const elem = this.array[i]

				if (typeof elem !== 'undefined') {
					visitor(elem)
				}
			}

			return
		}

		if (this.set) {
			this.set.forEach(visitor)

			return
		}

		throw new Error('no set or array')
	}
}
