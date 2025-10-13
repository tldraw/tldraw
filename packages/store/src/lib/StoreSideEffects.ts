import { UnknownRecord } from './BaseRecord'
import { Store } from './Store'

/**
 * Handler function called before a record is created in the store.
 * The handler receives the record to be created and can return a modified version.
 * Use this to validate, transform, or modify records before they are added to the store.
 *
 * @param record - The record about to be created
 * @param source - Whether the change originated from 'user' interaction or 'remote' synchronization
 * @returns The record to actually create (may be modified)
 *
 * @example
 * ```ts
 * const handler: StoreBeforeCreateHandler<MyRecord> = (record, source) => {
 *   // Ensure all user-created records have a timestamp
 *   if (source === 'user' && !record.createdAt) {
 *     return { ...record, createdAt: Date.now() }
 *   }
 *   return record
 * }
 * ```
 *
 * @public
 */
export type StoreBeforeCreateHandler<R extends UnknownRecord> = (
	record: R,
	source: 'remote' | 'user'
) => R
/**
 * Handler function called after a record has been successfully created in the store.
 * Use this for side effects that should happen after record creation, such as updating
 * related records or triggering notifications.
 *
 * @param record - The record that was created
 * @param source - Whether the change originated from 'user' interaction or 'remote' synchronization
 *
 * @example
 * ```ts
 * const handler: StoreAfterCreateHandler<BookRecord> = (book, source) => {
 *   if (source === 'user') {
 *     console.log(`New book added: ${book.title}`)
 *     updateAuthorBookCount(book.authorId)
 *   }
 * }
 * ```
 *
 * @public
 */
export type StoreAfterCreateHandler<R extends UnknownRecord> = (
	record: R,
	source: 'remote' | 'user'
) => void
/**
 * Handler function called before a record is updated in the store.
 * The handler receives the current and new versions of the record and can return
 * a modified version or the original to prevent the change.
 *
 * @param prev - The current version of the record in the store
 * @param next - The proposed new version of the record
 * @param source - Whether the change originated from 'user' interaction or 'remote' synchronization
 * @returns The record version to actually store (may be modified or the original to block change)
 *
 * @example
 * ```ts
 * const handler: StoreBeforeChangeHandler<ShapeRecord> = (prev, next, source) => {
 *   // Prevent shapes from being moved outside the canvas bounds
 *   if (next.x < 0 || next.y < 0) {
 *     return prev // Block the change
 *   }
 *   return next
 * }
 * ```
 *
 * @public
 */
export type StoreBeforeChangeHandler<R extends UnknownRecord> = (
	prev: R,
	next: R,
	source: 'remote' | 'user'
) => R
/**
 * Handler function called after a record has been successfully updated in the store.
 * Use this for side effects that should happen after record changes, such as
 * updating related records or maintaining consistency constraints.
 *
 * @param prev - The previous version of the record
 * @param next - The new version of the record that was stored
 * @param source - Whether the change originated from 'user' interaction or 'remote' synchronization
 *
 * @example
 * ```ts
 * const handler: StoreAfterChangeHandler<ShapeRecord> = (prev, next, source) => {
 *   // Update connected arrows when a shape moves
 *   if (prev.x !== next.x || prev.y !== next.y) {
 *     updateConnectedArrows(next.id)
 *   }
 * }
 * ```
 *
 * @public
 */
export type StoreAfterChangeHandler<R extends UnknownRecord> = (
	prev: R,
	next: R,
	source: 'remote' | 'user'
) => void
/**
 * Handler function called before a record is deleted from the store.
 * The handler can return `false` to prevent the deletion from occurring.
 *
 * @param record - The record about to be deleted
 * @param source - Whether the change originated from 'user' interaction or 'remote' synchronization
 * @returns `false` to prevent deletion, `void` or any other value to allow it
 *
 * @example
 * ```ts
 * const handler: StoreBeforeDeleteHandler<BookRecord> = (book, source) => {
 *   // Prevent deletion of books that are currently checked out
 *   if (book.isCheckedOut) {
 *     console.warn('Cannot delete checked out book')
 *     return false
 *   }
 *   // Allow deletion for other books
 * }
 * ```
 *
 * @public
 */
export type StoreBeforeDeleteHandler<R extends UnknownRecord> = (
	record: R,
	source: 'remote' | 'user'
) => void | false
/**
 * Handler function called after a record has been successfully deleted from the store.
 * Use this for cleanup operations and maintaining referential integrity.
 *
 * @param record - The record that was deleted
 * @param source - Whether the change originated from 'user' interaction or 'remote' synchronization
 *
 * @example
 * ```ts
 * const handler: StoreAfterDeleteHandler<ShapeRecord> = (shape, source) => {
 *   // Clean up arrows that were connected to this shape
 *   const connectedArrows = findArrowsConnectedTo(shape.id)
 *   store.remove(connectedArrows.map(arrow => arrow.id))
 * }
 * ```
 *
 * @public
 */
export type StoreAfterDeleteHandler<R extends UnknownRecord> = (
	record: R,
	source: 'remote' | 'user'
) => void

/**
 * Handler function called when a store operation (atomic transaction) completes.
 * This is useful for performing actions after a batch of changes has been applied,
 * such as triggering saves or sending notifications.
 *
 * @param source - Whether the operation originated from 'user' interaction or 'remote' synchronization
 *
 * @example
 * ```ts
 * const handler: StoreOperationCompleteHandler = (source) => {
 *   if (source === 'user') {
 *     // Auto-save after user operations complete
 *     saveStoreSnapshot()
 *   }
 * }
 * ```
 *
 * @public
 */
export type StoreOperationCompleteHandler = (source: 'remote' | 'user') => void

/**
 * The side effect manager (aka a "correct state enforcer") is responsible
 * for making sure that the store's state is always correct and consistent. This includes
 * things like: deleting a shape if its parent is deleted; unbinding
 * arrows when their binding target is deleted; maintaining referential integrity; etc.
 *
 * Side effects are organized into lifecycle hooks that run before and after
 * record operations (create, change, delete), allowing you to validate data,
 * transform records, and maintain business rules.
 *
 * @example
 * ```ts
 * const sideEffects = new StoreSideEffects(store)
 *
 * // Ensure arrows are deleted when their target shape is deleted
 * sideEffects.registerAfterDeleteHandler('shape', (shape) => {
 *   const arrows = store.query.records('arrow', () => ({
 *     toId: { eq: shape.id }
 *   })).get()
 *   store.remove(arrows.map(arrow => arrow.id))
 * })
 * ```
 *
 * @public
 */
export class StoreSideEffects<R extends UnknownRecord> {
	/**
	 * Creates a new side effects manager for the given store.
	 *
	 * store - The store instance to manage side effects for
	 */
	constructor(private readonly store: Store<R>) {}

	private _beforeCreateHandlers: { [K in string]?: StoreBeforeCreateHandler<any>[] } = {}
	private _afterCreateHandlers: { [K in string]?: StoreAfterCreateHandler<any>[] } = {}
	private _beforeChangeHandlers: { [K in string]?: StoreBeforeChangeHandler<any>[] } = {}
	private _afterChangeHandlers: { [K in string]?: StoreAfterChangeHandler<any>[] } = {}
	private _beforeDeleteHandlers: { [K in string]?: StoreBeforeDeleteHandler<any>[] } = {}
	private _afterDeleteHandlers: { [K in string]?: StoreAfterDeleteHandler<any>[] } = {}
	private _operationCompleteHandlers: StoreOperationCompleteHandler[] = []

	private _isEnabled = true
	/**
	 * Checks whether side effects are currently enabled.
	 * When disabled, all side effect handlers are bypassed.
	 *
	 * @returns `true` if side effects are enabled, `false` otherwise
	 * @internal
	 */
	isEnabled() {
		return this._isEnabled
	}
	/**
	 * Enables or disables side effects processing.
	 * When disabled, no side effect handlers will be called.
	 *
	 * @param enabled - Whether to enable or disable side effects
	 * @internal
	 */
	setIsEnabled(enabled: boolean) {
		this._isEnabled = enabled
	}

	/**
	 * Processes all registered 'before create' handlers for a record.
	 * Handlers are called in registration order and can transform the record.
	 *
	 * @param record - The record about to be created
	 * @param source - Whether the change originated from 'user' or 'remote'
	 * @returns The potentially modified record to actually create
	 * @internal
	 */
	handleBeforeCreate(record: R, source: 'remote' | 'user') {
		if (!this._isEnabled) return record

		const handlers = this._beforeCreateHandlers[record.typeName] as StoreBeforeCreateHandler<R>[]
		if (handlers) {
			let r = record
			for (const handler of handlers) {
				r = handler(r, source)
			}
			return r
		}

		return record
	}

	/**
	 * Processes all registered 'after create' handlers for a record.
	 * Handlers are called in registration order after the record is created.
	 *
	 * @param record - The record that was created
	 * @param source - Whether the change originated from 'user' or 'remote'
	 * @internal
	 */
	handleAfterCreate(record: R, source: 'remote' | 'user') {
		if (!this._isEnabled) return

		const handlers = this._afterCreateHandlers[record.typeName] as StoreAfterCreateHandler<R>[]
		if (handlers) {
			for (const handler of handlers) {
				handler(record, source)
			}
		}
	}

	/**
	 * Processes all registered 'before change' handlers for a record.
	 * Handlers are called in registration order and can modify or block the change.
	 *
	 * @param prev - The current version of the record
	 * @param next - The proposed new version of the record
	 * @param source - Whether the change originated from 'user' or 'remote'
	 * @returns The potentially modified record to actually store
	 * @internal
	 */
	handleBeforeChange(prev: R, next: R, source: 'remote' | 'user') {
		if (!this._isEnabled) return next

		const handlers = this._beforeChangeHandlers[next.typeName] as StoreBeforeChangeHandler<R>[]
		if (handlers) {
			let r = next
			for (const handler of handlers) {
				r = handler(prev, r, source)
			}
			return r
		}

		return next
	}

	/**
	 * Processes all registered 'after change' handlers for a record.
	 * Handlers are called in registration order after the record is updated.
	 *
	 * @param prev - The previous version of the record
	 * @param next - The new version of the record that was stored
	 * @param source - Whether the change originated from 'user' or 'remote'
	 * @internal
	 */
	handleAfterChange(prev: R, next: R, source: 'remote' | 'user') {
		if (!this._isEnabled) return

		const handlers = this._afterChangeHandlers[next.typeName] as StoreAfterChangeHandler<R>[]
		if (handlers) {
			for (const handler of handlers) {
				handler(prev, next, source)
			}
		}
	}

	/**
	 * Processes all registered 'before delete' handlers for a record.
	 * If any handler returns `false`, the deletion is prevented.
	 *
	 * @param record - The record about to be deleted
	 * @param source - Whether the change originated from 'user' or 'remote'
	 * @returns `true` to allow deletion, `false` to prevent it
	 * @internal
	 */
	handleBeforeDelete(record: R, source: 'remote' | 'user') {
		if (!this._isEnabled) return true

		const handlers = this._beforeDeleteHandlers[record.typeName] as StoreBeforeDeleteHandler<R>[]
		if (handlers) {
			for (const handler of handlers) {
				if (handler(record, source) === false) {
					return false
				}
			}
		}
		return true
	}

	/**
	 * Processes all registered 'after delete' handlers for a record.
	 * Handlers are called in registration order after the record is deleted.
	 *
	 * @param record - The record that was deleted
	 * @param source - Whether the change originated from 'user' or 'remote'
	 * @internal
	 */
	handleAfterDelete(record: R, source: 'remote' | 'user') {
		if (!this._isEnabled) return

		const handlers = this._afterDeleteHandlers[record.typeName] as StoreAfterDeleteHandler<R>[]
		if (handlers) {
			for (const handler of handlers) {
				handler(record, source)
			}
		}
	}

	/**
	 * Processes all registered operation complete handlers.
	 * Called after an atomic store operation finishes.
	 *
	 * @param source - Whether the operation originated from 'user' or 'remote'
	 * @internal
	 */
	handleOperationComplete(source: 'remote' | 'user') {
		if (!this._isEnabled) return

		for (const handler of this._operationCompleteHandlers) {
			handler(source)
		}
	}

	/**
	 * Internal helper for registering multiple side effect handlers at once and keeping them organized.
	 * This provides a convenient way to register handlers for multiple record types and lifecycle events
	 * in a single call, returning a single cleanup function.
	 *
	 * @param handlersByType - An object mapping record type names to their respective handlers
	 * @returns A function that removes all registered handlers when called
	 *
	 * @example
	 * ```ts
	 * const cleanup = sideEffects.register({
	 *   shape: {
	 *     afterDelete: (shape) => console.log('Shape deleted:', shape.id),
	 *     beforeChange: (prev, next) => ({ ...next, lastModified: Date.now() })
	 *   },
	 *   arrow: {
	 *     afterCreate: (arrow) => updateConnectedShapes(arrow)
	 *   }
	 * })
	 *
	 * // Later, remove all handlers
	 * cleanup()
	 * ```
	 *
	 * @internal
	 */
	register(handlersByType: {
		[T in R as T['typeName']]?: {
			beforeCreate?: StoreBeforeCreateHandler<T>
			afterCreate?: StoreAfterCreateHandler<T>
			beforeChange?: StoreBeforeChangeHandler<T>
			afterChange?: StoreAfterChangeHandler<T>
			beforeDelete?: StoreBeforeDeleteHandler<T>
			afterDelete?: StoreAfterDeleteHandler<T>
		}
	}) {
		const disposes: (() => void)[] = []
		for (const [type, handlers] of Object.entries(handlersByType) as any) {
			if (handlers?.beforeCreate) {
				disposes.push(this.registerBeforeCreateHandler(type, handlers.beforeCreate))
			}
			if (handlers?.afterCreate) {
				disposes.push(this.registerAfterCreateHandler(type, handlers.afterCreate))
			}
			if (handlers?.beforeChange) {
				disposes.push(this.registerBeforeChangeHandler(type, handlers.beforeChange))
			}
			if (handlers?.afterChange) {
				disposes.push(this.registerAfterChangeHandler(type, handlers.afterChange))
			}
			if (handlers?.beforeDelete) {
				disposes.push(this.registerBeforeDeleteHandler(type, handlers.beforeDelete))
			}
			if (handlers?.afterDelete) {
				disposes.push(this.registerAfterDeleteHandler(type, handlers.afterDelete))
			}
		}
		return () => {
			for (const dispose of disposes) dispose()
		}
	}

	/**
	 * Register a handler to be called before a record of a certain type is created. Return a
	 * modified record from the handler to change the record that will be created.
	 *
	 * Use this handle only to modify the creation of the record itself. If you want to trigger a
	 * side-effect on a different record (for example, moving one shape when another is created),
	 * use {@link StoreSideEffects.registerAfterCreateHandler} instead.
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
	 *
	 * @returns A callback that removes the handler.
	 */
	registerBeforeCreateHandler<T extends R['typeName']>(
		typeName: T,
		handler: StoreBeforeCreateHandler<R & { typeName: T }>
	) {
		const handlers = this._beforeCreateHandlers[typeName] as StoreBeforeCreateHandler<any>[]
		if (!handlers) this._beforeCreateHandlers[typeName] = []
		this._beforeCreateHandlers[typeName]!.push(handler)
		return () => remove(this._beforeCreateHandlers[typeName]!, handler)
	}

	/**
	 * Register a handler to be called after a record is created. This is useful for side-effects
	 * that would update _other_ records. If you want to modify the record being created use
	 * {@link StoreSideEffects.registerBeforeCreateHandler} instead.
	 *
	 * @example
	 * ```ts
	 * editor.sideEffects.registerAfterCreateHandler('page', (page, source) => {
	 *     // Automatically create a shape when a page is created
	 *     editor.createShape<TLTextShape>({
	 *         id: createShapeId(),
	 *         type: 'text',
	 *         props: { richText: toRichText(page.name) },
	 *     })
	 * })
	 * ```
	 *
	 * @param typeName - The type of record to listen for
	 * @param handler - The handler to call
	 *
	 * @returns A callback that removes the handler.
	 */
	registerAfterCreateHandler<T extends R['typeName']>(
		typeName: T,
		handler: StoreAfterCreateHandler<R & { typeName: T }>
	) {
		const handlers = this._afterCreateHandlers[typeName] as StoreAfterCreateHandler<any>[]
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
	 * {@link StoreSideEffects.registerAfterChangeHandler} instead.
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
	 *
	 * @returns A callback that removes the handler.
	 */
	registerBeforeChangeHandler<T extends R['typeName']>(
		typeName: T,
		handler: StoreBeforeChangeHandler<R & { typeName: T }>
	) {
		const handlers = this._beforeChangeHandlers[typeName] as StoreBeforeChangeHandler<any>[]
		if (!handlers) this._beforeChangeHandlers[typeName] = []
		this._beforeChangeHandlers[typeName]!.push(handler)
		return () => remove(this._beforeChangeHandlers[typeName]!, handler)
	}

	/**
	 * Register a handler to be called after a record is changed. This is useful for side-effects
	 * that would update _other_ records - if you want to modify the record being changed, use
	 * {@link StoreSideEffects.registerBeforeChangeHandler} instead.
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
	 *
	 * @returns A callback that removes the handler.
	 */
	registerAfterChangeHandler<T extends R['typeName']>(
		typeName: T,
		handler: StoreAfterChangeHandler<R & { typeName: T }>
	) {
		const handlers = this._afterChangeHandlers[typeName] as StoreAfterChangeHandler<any>[]
		if (!handlers) this._afterChangeHandlers[typeName] = []
		this._afterChangeHandlers[typeName]!.push(handler as StoreAfterChangeHandler<any>)
		return () => remove(this._afterChangeHandlers[typeName]!, handler)
	}

	/**
	 * Register a handler to be called before a record is deleted. The handler can return `false` to
	 * prevent the deletion.
	 *
	 * Use this handler only for intercepting deletions of the record itself. If you want to do
	 * something to other records in response to a deletion, use
	 * {@link StoreSideEffects.registerAfterDeleteHandler} instead.
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
	 *
	 * @returns A callback that removes the handler.
	 */
	registerBeforeDeleteHandler<T extends R['typeName']>(
		typeName: T,
		handler: StoreBeforeDeleteHandler<R & { typeName: T }>
	) {
		const handlers = this._beforeDeleteHandlers[typeName] as StoreBeforeDeleteHandler<any>[]
		if (!handlers) this._beforeDeleteHandlers[typeName] = []
		this._beforeDeleteHandlers[typeName]!.push(handler as StoreBeforeDeleteHandler<any>)
		return () => remove(this._beforeDeleteHandlers[typeName]!, handler)
	}

	/**
	 * Register a handler to be called after a record is deleted. This is useful for side-effects
	 * that would update _other_ records - if you want to block the deletion of the record itself,
	 * use {@link StoreSideEffects.registerBeforeDeleteHandler} instead.
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
	 *
	 * @returns A callback that removes the handler.
	 */
	registerAfterDeleteHandler<T extends R['typeName']>(
		typeName: T,
		handler: StoreAfterDeleteHandler<R & { typeName: T }>
	) {
		const handlers = this._afterDeleteHandlers[typeName] as StoreAfterDeleteHandler<any>[]
		if (!handlers) this._afterDeleteHandlers[typeName] = []
		this._afterDeleteHandlers[typeName]!.push(handler as StoreAfterDeleteHandler<any>)
		return () => remove(this._afterDeleteHandlers[typeName]!, handler)
	}

	/**
	 * Register a handler to be called when a store completes an atomic operation.
	 *
	 * @example
	 * ```ts
	 * let count = 0
	 *
	 * editor.sideEffects.registerOperationCompleteHandler(() => count++)
	 *
	 * editor.selectAll()
	 * expect(count).toBe(1)
	 *
	 * editor.store.atomic(() => {
	 *	editor.selectNone()
	 * 	editor.selectAll()
	 * })
	 *
	 * expect(count).toBe(2)
	 * ```
	 *
	 * @param handler - The handler to call
	 *
	 * @returns A callback that removes the handler.
	 *
	 * @public
	 */
	registerOperationCompleteHandler(handler: StoreOperationCompleteHandler) {
		this._operationCompleteHandlers.push(handler)
		return () => remove(this._operationCompleteHandlers, handler)
	}
}

function remove(array: any[], item: any) {
	const index = array.indexOf(item)
	if (index >= 0) {
		array.splice(index, 1)
	}
}
