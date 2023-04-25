import { CollectionDiff } from './Store'

/**
 * A class that can be used to incrementally construct a set of records.
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
	 * Get the next value of the set.
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
	 * Add an item to the set.
	 *
	 * @param item - The item to add.
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
	 * Remove an item from the set.
	 *
	 * @param item - The item to remove.
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
