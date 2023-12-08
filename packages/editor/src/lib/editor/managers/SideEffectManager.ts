import {
	AfterChangeHandler,
	AfterCreateHandler,
	AfterDeleteHandler,
	BeforeChangeHandler,
	BeforeCreateHandler,
	BeforeDeleteHandler,
} from '@tldraw/store'
import { TLRecord, TLStore } from '@tldraw/tlschema'
import { removeFromArray } from '@tldraw/utils'

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
		editor.history.onBatchComplete = () => {
			this._batchCompleteHandlers.forEach((fn) => fn())
		}
	}

	private _batchCompleteHandlers: TLBatchCompleteHandler[] = []

	registerBeforeCreateHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: BeforeCreateHandler<TLRecord & { typeName: T }>
	) {
		return this.editor.store.registerBeforeCreateHandler<T>(typeName, handler)
	}

	registerAfterCreateHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: AfterCreateHandler<TLRecord & { typeName: T }>
	) {
		return this.editor.store.registerAfterCreateHandler<T>(typeName, handler)
	}

	registerBeforeChangeHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: BeforeChangeHandler<TLRecord & { typeName: T }>
	) {
		return this.editor.store.registerBeforeChangeHandler<T>(typeName, handler)
	}

	registerAfterChangeHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: AfterChangeHandler<TLRecord & { typeName: T }>
	) {
		return this.editor.store.registerAfterChangeHandler<T>(typeName, handler)
	}

	registerBeforeDeleteHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: BeforeDeleteHandler<TLRecord & { typeName: T }>
	) {
		return this.editor.store.registerBeforeDeleteHandler<T>(typeName, handler)
	}

	registerAfterDeleteHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: AfterDeleteHandler<TLRecord & { typeName: T }>
	) {
		return this.editor.store.registerAfterDeleteHandler<T>(typeName, handler)
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
		return () => removeFromArray(this._batchCompleteHandlers, handler)
	}
}
