import { TLRecord, TLStore } from '@tldraw/tlschema'

/** @public */
export type TLBeforeCreateHandler<R extends TLRecord> = (record: R, source: 'remote' | 'user') => R
/** @public */
export type TLAfterCreateHandler<R extends TLRecord> = (
	record: R,
	source: 'remote' | 'user'
) => void
/** @public */
export type TLBeforeChangeHandler<R extends TLRecord> = (
	prev: R,
	next: R,
	source: 'remote' | 'user'
) => R
/** @public */
export type TLAfterChangeHandler<R extends TLRecord> = (
	prev: R,
	next: R,
	source: 'remote' | 'user'
) => void
/** @public */
export type TLBeforeDeleteHandler<R extends TLRecord> = (
	record: R,
	source: 'remote' | 'user'
) => void | false
/** @public */
export type TLAfterDeleteHandler<R extends TLRecord> = (
	record: R,
	source: 'remote' | 'user'
) => void
/** @public */
export type TLBatchCompleteHandler = () => void

/**
 * The side effect manager (aka a "correct state enforcer") is responsible
 * for making sure that the editor's state is always correct. This includes
 * things like: deleting a shape if its parent is deleted; unbinding
 * arrows when their binding target is deleted; etc.
 *
 * @public
 */
export class SideEffectManager<
	CTX extends {
		store: TLStore
		history: { onBatchComplete: () => void }
	}
> {
	constructor(public editor: CTX) {
		editor.store.onBeforeCreate = (record, source) => {
			const handlers = this._beforeCreateHandlers[
				record.typeName
			] as TLBeforeCreateHandler<TLRecord>[]
			if (handlers) {
				let r = record
				for (const handler of handlers) {
					r = handler(r, source)
				}
				return r
			}

			return record
		}

		editor.store.onAfterCreate = (record, source) => {
			const handlers = this._afterCreateHandlers[
				record.typeName
			] as TLAfterCreateHandler<TLRecord>[]
			if (handlers) {
				for (const handler of handlers) {
					handler(record, source)
				}
			}
		}

		editor.store.onBeforeChange = (prev, next, source) => {
			const handlers = this._beforeChangeHandlers[
				next.typeName
			] as TLBeforeChangeHandler<TLRecord>[]
			if (handlers) {
				let r = next
				for (const handler of handlers) {
					r = handler(prev, r, source)
				}
				return r
			}

			return next
		}

		let updateDepth = 0

		editor.store.onAfterChange = (prev, next, source) => {
			updateDepth++

			if (updateDepth > 1000) {
				console.error('[CleanupManager.onAfterChange] Maximum update depth exceeded, bailing out.')
			} else {
				const handlers = this._afterChangeHandlers[
					next.typeName
				] as TLAfterChangeHandler<TLRecord>[]
				if (handlers) {
					for (const handler of handlers) {
						handler(prev, next, source)
					}
				}
			}

			updateDepth--
		}

		editor.store.onBeforeDelete = (record, source) => {
			const handlers = this._beforeDeleteHandlers[
				record.typeName
			] as TLBeforeDeleteHandler<TLRecord>[]
			if (handlers) {
				for (const handler of handlers) {
					if (handler(record, source) === false) {
						return false
					}
				}
			}
		}

		editor.store.onAfterDelete = (record, source) => {
			const handlers = this._afterDeleteHandlers[
				record.typeName
			] as TLAfterDeleteHandler<TLRecord>[]
			if (handlers) {
				for (const handler of handlers) {
					handler(record, source)
				}
			}
		}

		editor.history.onBatchComplete = () => {
			this._batchCompleteHandlers.forEach((fn) => fn())
		}
	}

	private _beforeCreateHandlers: Partial<{
		[K in TLRecord['typeName']]: TLBeforeCreateHandler<TLRecord & { typeName: K }>[]
	}> = {}
	private _afterCreateHandlers: Partial<{
		[K in TLRecord['typeName']]: TLAfterCreateHandler<TLRecord & { typeName: K }>[]
	}> = {}
	private _beforeChangeHandlers: Partial<{
		[K in TLRecord['typeName']]: TLBeforeChangeHandler<TLRecord & { typeName: K }>[]
	}> = {}
	private _afterChangeHandlers: Partial<{
		[K in TLRecord['typeName']]: TLAfterChangeHandler<TLRecord & { typeName: K }>[]
	}> = {}

	private _beforeDeleteHandlers: Partial<{
		[K in TLRecord['typeName']]: TLBeforeDeleteHandler<TLRecord & { typeName: K }>[]
	}> = {}

	private _afterDeleteHandlers: Partial<{
		[K in TLRecord['typeName']]: TLAfterDeleteHandler<TLRecord & { typeName: K }>[]
	}> = {}

	private _batchCompleteHandlers: TLBatchCompleteHandler[] = []

	registerBeforeCreateHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: TLBeforeCreateHandler<TLRecord & { typeName: T }>
	) {
		const handlers = this._beforeCreateHandlers[typeName] as TLBeforeCreateHandler<any>[]
		if (!handlers) this._beforeCreateHandlers[typeName] = []
		this._beforeCreateHandlers[typeName]!.push(handler)
		return () => remove(this._beforeCreateHandlers[typeName]!, handler)
	}

	registerAfterCreateHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: TLAfterCreateHandler<TLRecord & { typeName: T }>
	) {
		const handlers = this._afterCreateHandlers[typeName] as TLAfterCreateHandler<any>[]
		if (!handlers) this._afterCreateHandlers[typeName] = []
		this._afterCreateHandlers[typeName]!.push(handler)
		return () => remove(this._afterCreateHandlers[typeName]!, handler)
	}

	registerBeforeChangeHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: TLBeforeChangeHandler<TLRecord & { typeName: T }>
	) {
		const handlers = this._beforeChangeHandlers[typeName] as TLBeforeChangeHandler<any>[]
		if (!handlers) this._beforeChangeHandlers[typeName] = []
		this._beforeChangeHandlers[typeName]!.push(handler)
		return () => remove(this._beforeChangeHandlers[typeName]!, handler)
	}

	registerAfterChangeHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: TLAfterChangeHandler<TLRecord & { typeName: T }>
	) {
		const handlers = this._afterChangeHandlers[typeName] as TLAfterChangeHandler<any>[]
		if (!handlers) this._afterChangeHandlers[typeName] = []
		this._afterChangeHandlers[typeName]!.push(handler as TLAfterChangeHandler<any>)
		return () => remove(this._afterChangeHandlers[typeName]!, handler)
	}

	registerBeforeDeleteHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: TLBeforeDeleteHandler<TLRecord & { typeName: T }>
	) {
		const handlers = this._beforeDeleteHandlers[typeName] as TLBeforeDeleteHandler<any>[]
		if (!handlers) this._beforeDeleteHandlers[typeName] = []
		this._beforeDeleteHandlers[typeName]!.push(handler as TLBeforeDeleteHandler<any>)
		return () => remove(this._beforeDeleteHandlers[typeName]!, handler)
	}

	registerAfterDeleteHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: TLAfterDeleteHandler<TLRecord & { typeName: T }>
	) {
		const handlers = this._afterDeleteHandlers[typeName] as TLAfterDeleteHandler<any>[]
		if (!handlers) this._afterDeleteHandlers[typeName] = []
		this._afterDeleteHandlers[typeName]!.push(handler as TLAfterDeleteHandler<any>)
		return () => remove(this._afterDeleteHandlers[typeName]!, handler)
	}

	/**
	 * Register a handler to be called when a store completes a batch.
	 *
	 * @example
	 * ```ts
	 * let count = 0
	 *
	 * editor.cleanup.registerBatchCompleteHandler(() => count++)
	 *
	 * editor.selectAll()
	 * expect(count).toBe(1)
	 *
	 * editor.batch(() => {
	 *	editor.selectNone()
	 * 	editor.selectAll()
	 * })
	 *
	 * expect(count).toBe(2)
	 * ```
	 *
	 * @param handler - The handler to call
	 *
	 * @public
	 */
	registerBatchCompleteHandler(handler: TLBatchCompleteHandler) {
		this._batchCompleteHandlers.push(handler)
		return () => remove(this._batchCompleteHandlers, handler)
	}
}

function remove(array: any[], item: any) {
	const index = array.indexOf(item)
	if (index >= 0) {
		array.splice(index, 1)
	}
}
