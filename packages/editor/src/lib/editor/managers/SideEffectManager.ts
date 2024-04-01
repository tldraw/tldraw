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
	},
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

	/**
	 * Register a handler to be called before a record of a certain type is created. Return a
	 * modified record from the handler to change the record that will be created.
	 *
	 * Use this handle only to modify the creation of the record itself. If you want to trigger a
	 * side-effect on a different record (for example, moving one shape when another is created),
	 * use {@link SideEffectManager.registerAfterCreateHandler} instead.
	 *
	 * @example
	 * ```ts
	 * editor.sideEffects.registerBeforeCreateHandler('shape', (shape, source) => {
	 *     // only modify shapes created by the user
	 *     if (source !== 'user') return shape
	 *
	 *     //by default, arrow shapes have no label. Let's make sure they always have a label.
	 *     if (shape.type === 'arrow') {
	 *         return {...shape, props: {...shape.props, text: 'an arrow'}}
	 *     }
	 *
	 *     // other shapes get returned unmodified
	 *     return shape
	 * })
	 * ```
	 *
	 * @param typeName - The type of record to listen for
	 * @param handler - The handler to call
	 */
	registerBeforeCreateHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: TLBeforeCreateHandler<TLRecord & { typeName: T }>
	) {
		const handlers = this._beforeCreateHandlers[typeName] as TLBeforeCreateHandler<any>[]
		if (!handlers) this._beforeCreateHandlers[typeName] = []
		this._beforeCreateHandlers[typeName]!.push(handler)
		return () => remove(this._beforeCreateHandlers[typeName]!, handler)
	}

	/**
	 * Register a handler to be called after a record is created. This is useful for side-effects
	 * that would update _other_ records. If you want to modify the record being created use
	 * {@link SideEffectManager.registerBeforeCreateHandler} instead.
	 *
	 * @example
	 * ```ts
	 * editor.sideEffects.registerAfterCreateHandler('page', (page, source) => {
	 *     // Automatically create a shape when a page is created
	 *     editor.createShape({
	 *         id: createShapeId(),
	 *         type: 'text',
	 *         props: { text: page.name },
	 *     })
	 * })
	 * ```
	 *
	 * @param typeName - The type of record to listen for
	 * @param handler - The handler to call
	 */
	registerAfterCreateHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: TLAfterCreateHandler<TLRecord & { typeName: T }>
	) {
		const handlers = this._afterCreateHandlers[typeName] as TLAfterCreateHandler<any>[]
		if (!handlers) this._afterCreateHandlers[typeName] = []
		this._afterCreateHandlers[typeName]!.push(handler)
		return () => remove(this._afterCreateHandlers[typeName]!, handler)
	}

	/**
	 * Register a handler to be called before a record is changed. The handler is given the old and
	 * new record - you can return a modified record to apply a different update, or the old record
	 * to block the update entirely.
	 *
	 * Use this handler only for intercepting updates to the record itself. If you want to update
	 * other records in response to a change, use
	 * {@link SideEffectManager.registerAfterChangeHandler} instead.
	 *
	 * @example
	 * ```ts
	 * editor.sideEffects.registerBeforeChangeHandler('shape', (prev, next, source) => {
	 *     if (next.isLocked && !prev.isLocked) {
	 *         // prevent shapes from ever being locked:
	 *         return prev
	 *     }
	 *     // other types of change are allowed
	 *     return next
	 * })
	 * ```
	 *
	 * @param typeName - The type of record to listen for
	 * @param handler - The handler to call
	 */
	registerBeforeChangeHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: TLBeforeChangeHandler<TLRecord & { typeName: T }>
	) {
		const handlers = this._beforeChangeHandlers[typeName] as TLBeforeChangeHandler<any>[]
		if (!handlers) this._beforeChangeHandlers[typeName] = []
		this._beforeChangeHandlers[typeName]!.push(handler)
		return () => remove(this._beforeChangeHandlers[typeName]!, handler)
	}

	/**
	 * Register a handler to be called after a record is changed. This is useful for side-effects
	 * that would update _other_ records - if you want to modify the record being changed, use
	 * {@link SideEffectManager.registerBeforeChangeHandler} instead.
	 *
	 * @example
	 * ```ts
	 * editor.sideEffects.registerAfterChangeHandler('shape', (prev, next, source) => {
	 *     if (next.props.color === 'red') {
	 *         // there can only be one red shape at a time:
	 *         const otherRedShapes = editor.getCurrentPageShapes().filter(s => s.props.color === 'red' && s.id !== next.id)
	 *         editor.updateShapes(otherRedShapes.map(s => ({...s, props: {...s.props, color: 'blue'}})))
	 *     }
	 * })
	 * ```
	 *
	 * @param typeName - The type of record to listen for
	 * @param handler - The handler to call
	 */
	registerAfterChangeHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: TLAfterChangeHandler<TLRecord & { typeName: T }>
	) {
		const handlers = this._afterChangeHandlers[typeName] as TLAfterChangeHandler<any>[]
		if (!handlers) this._afterChangeHandlers[typeName] = []
		this._afterChangeHandlers[typeName]!.push(handler as TLAfterChangeHandler<any>)
		return () => remove(this._afterChangeHandlers[typeName]!, handler)
	}

	/**
	 * Register a handler to be called before a record is deleted. The handler can return `false` to
	 * prevent the deletion.
	 *
	 * Use this handler only for intercepting deletions of the record itself. If you want to do
	 * something to other records in response to a deletion, use
	 * {@link SideEffectManager.registerAfterDeleteHandler} instead.
	 *
	 * @example
	 * ```ts
	 * editor.sideEffects.registerBeforeDeleteHandler('shape', (shape, source) => {
	 *     if (shape.props.color === 'red') {
	 *         // prevent red shapes from being deleted
	 * 	       return false
	 *     }
	 * })
	 * ```
	 *
	 * @param typeName - The type of record to listen for
	 * @param handler - The handler to call
	 */
	registerBeforeDeleteHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: TLBeforeDeleteHandler<TLRecord & { typeName: T }>
	) {
		const handlers = this._beforeDeleteHandlers[typeName] as TLBeforeDeleteHandler<any>[]
		if (!handlers) this._beforeDeleteHandlers[typeName] = []
		this._beforeDeleteHandlers[typeName]!.push(handler as TLBeforeDeleteHandler<any>)
		return () => remove(this._beforeDeleteHandlers[typeName]!, handler)
	}

	/**
	 * Register a handler to be called after a record is deleted. This is useful for side-effects
	 * that would update _other_ records - if you want to block the deletion of the record itself,
	 * use {@link SideEffectManager.registerBeforeDeleteHandler} instead.
	 *
	 * @example
	 * ```ts
	 * editor.sideEffects.registerAfterDeleteHandler('shape', (shape, source) => {
	 *     // if the last shape in a frame is deleted, delete the frame too:
	 *     const parentFrame = editor.getShape(shape.parentId)
	 *     if (!parentFrame || parentFrame.type !== 'frame') return
	 *
	 *     const siblings = editor.getSortedChildIdsForParent(parentFrame)
	 *     if (siblings.length === 0) {
	 *         editor.deleteShape(parentFrame.id)
	 *     }
	 * })
	 * ```
	 *
	 * @param typeName - The type of record to listen for
	 * @param handler - The handler to call
	 */
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
