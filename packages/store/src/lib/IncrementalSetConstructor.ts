import { CollectionDiff } from './Store'

/**
 * A utility class for incrementally building a set while tracking changes. This class allows
 * you to add and remove items from a set while maintaining a diff of what was added and
 * removed from the original set. It's optimized for cases where you need to track changes
 * to a set over time and get both the final result and the change delta.
 *
 * @example
 * ```ts
 * const originalSet = new Set(['a', 'b', 'c'])
 * const constructor = new IncrementalSetConstructor(originalSet)
 *
 * constructor.add('d') // Add new item
 * constructor.remove('b') // Remove existing item
 * constructor.add('a') // Re-add removed item (no-op since already present)
 *
 * const result = constructor.get()
 * // result.value contains Set(['a', 'c', 'd'])
 * // result.diff contains { added: Set(['d']), removed: Set(['b']) }
 * ```
 *
 * @internal
 */
export class IncrementalSetConstructor<T> {
	/**
	 * The next value of the set.
	 *
	 * @internal
	 */
	private nextValue?: Set<T>

	/**
	 * The diff of the set.
	 *
	 * @internal
	 */
	private diff?: CollectionDiff<T>

	constructor(
		/**
		 * The previous value of the set.
		 *
		 * @internal
		 * @readonly
		 */
		private readonly previousValue: Set<T>
	) {}

	/**
	 * Gets the result of the incremental set construction if any changes were made.
	 * Returns undefined if no additions or removals occurred.
	 *
	 * @returns An object containing the final set value and the diff of changes,
	 * or undefined if no changes were made
	 *
	 * @example
	 * ```ts
	 * const constructor = new IncrementalSetConstructor(new Set(['a', 'b']))
	 * constructor.add('c')
	 *
	 * const result = constructor.get()
	 * // result = {
	 * //   value: Set(['a', 'b', 'c']),
	 * //   diff: { added: Set(['c']) }
	 * // }
	 * ```
	 *
	 * @public
	 */
	public get() {
		const numRemoved = this.diff?.removed?.size ?? 0
		const numAdded = this.diff?.added?.size ?? 0
		if (numRemoved === 0 && numAdded === 0) {
			return undefined
		}
		return { value: this.nextValue!, diff: this.diff! }
	}

	/**
	 * Add an item to the set.
	 *
	 * @param item - The item to add.
	 * @param wasAlreadyPresent - Whether the item was already present in the set.
	 * @internal
	 */
	private _add(item: T, wasAlreadyPresent: boolean) {
		this.nextValue ??= new Set(this.previousValue)
		this.nextValue.add(item)

		this.diff ??= {}
		if (wasAlreadyPresent) {
			this.diff.removed?.delete(item)
		} else {
			this.diff.added ??= new Set()
			this.diff.added.add(item)
		}
	}

	/**
	 * Adds an item to the set. If the item was already present in the original set
	 * and was previously removed during this construction, it will be restored.
	 * If the item is already present and wasn't removed, this is a no-op.
	 *
	 * @param item - The item to add to the set
	 *
	 * @example
	 * ```ts
	 * const constructor = new IncrementalSetConstructor(new Set(['a', 'b']))
	 * constructor.add('c') // Adds new item
	 * constructor.add('a') // No-op, already present
	 * constructor.remove('b')
	 * constructor.add('b') // Restores previously removed item
	 * ```
	 *
	 * @public
	 */
	add(item: T) {
		const wasAlreadyPresent = this.previousValue.has(item)
		if (wasAlreadyPresent) {
			const wasRemoved = this.diff?.removed?.has(item)
			// if it wasn't removed during the lifetime of this set constructor, there's no need to add it again
			if (!wasRemoved) return
			return this._add(item, wasAlreadyPresent)
		}
		const isCurrentlyPresent = this.nextValue?.has(item)
		// if it's already there, no need to add it again
		if (isCurrentlyPresent) return
		// otherwise add it
		this._add(item, wasAlreadyPresent)
	}

	/**
	 * Remove an item from the set.
	 *
	 * @param item - The item to remove.
	 * @param wasAlreadyPresent - Whether the item was already present in the set.
	 * @internal
	 */
	private _remove(item: T, wasAlreadyPresent: boolean) {
		this.nextValue ??= new Set(this.previousValue)
		this.nextValue.delete(item)

		this.diff ??= {}
		if (wasAlreadyPresent) {
			// it was in the original set, so we need to add it to the removed diff
			this.diff.removed ??= new Set()
			this.diff.removed.add(item)
		} else {
			// if it was added during the lifetime of this set constructor, we need to remove it from the added diff
			this.diff.added?.delete(item)
		}
	}

	/**
	 * Removes an item from the set. If the item wasn't present in the original set
	 * and was added during this construction, it will be removed from the added diff.
	 * If the item is not present at all, this is a no-op.
	 *
	 * @param item - The item to remove from the set
	 *
	 * @example
	 * ```ts
	 * const constructor = new IncrementalSetConstructor(new Set(['a', 'b']))
	 * constructor.remove('a') // Removes existing item
	 * constructor.remove('c') // No-op, not present
	 * constructor.add('d')
	 * constructor.remove('d') // Removes recently added item
	 * ```
	 *
	 * @public
	 */
	remove(item: T) {
		const wasAlreadyPresent = this.previousValue.has(item)
		if (!wasAlreadyPresent) {
			const wasAdded = this.diff?.added?.has(item)
			// if it wasn't added during the lifetime of this set constructor, there's no need to remove it
			if (!wasAdded) return
			return this._remove(item, wasAlreadyPresent)
		}
		const hasAlreadyBeenRemoved = this.diff?.removed?.has(item)
		// if it's already removed, no need to remove it again
		if (hasAlreadyBeenRemoved) return
		// otherwise remove it
		this._remove(item, wasAlreadyPresent)
	}
}
