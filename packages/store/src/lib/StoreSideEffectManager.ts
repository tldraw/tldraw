import { removeFromArray } from '@tldraw/utils'
import { UnknownRecord } from './BaseRecord'
import { ChangeSource } from './Store'

/**
 * A function that is called before a record is created. It can return a new record to be created
 * instead of the one that was passed in.
 * @public
 */
export type BeforeCreateHandler<R extends UnknownRecord> = (record: R, source: ChangeSource) => R
/**
 * A function that is called after a record is created.
 * @public
 */
export type AfterCreateHandler<R extends UnknownRecord> = (record: R, source: ChangeSource) => void
/**
 * A function that is called before a record is changed. It is passed the old and new record, and
 * can return a different record to be used instead of the new one.
 * @public
 */
export type BeforeChangeHandler<R extends UnknownRecord> = (
	prev: R,
	next: R,
	source: ChangeSource
) => R
/**
 * A function that is called after a record is changed. It is passed the old and new record.
 * @public
 */
export type AfterChangeHandler<R extends UnknownRecord> = (
	prev: R,
	next: R,
	source: ChangeSource
) => void
/**
 * A function that is called before a record is deleted. It can return `false` to prevent the record
 * from being deleted.
 * @public
 */
export type BeforeDeleteHandler<R extends UnknownRecord> = (
	record: R,
	source: ChangeSource
) => void | false
/**
 * A function that is called after a record is deleted.
 * @public
 */
export type AfterDeleteHandler<R extends UnknownRecord> = (record: R, source: ChangeSource) => void

/**
 * The side effect manager (aka a "correct state enforcer") is responsible
 * for making sure that the store's state is always correct. This includes
 * things like: deleting a shape if its parent is deleted; unbinding
 * arrows when their binding target is deleted; etc.
 */
export class StoreSideEffectManager<R extends UnknownRecord = UnknownRecord> {
	private updateDepth = 0
	private beforeCreateHandlers: Record<string, BeforeCreateHandler<R>[]> = {}
	private afterCreateHandlers: Record<string, AfterCreateHandler<R>[]> = {}
	private beforeChangeHandlers: Record<string, BeforeChangeHandler<R>[]> = {}
	private afterChangeHandlers: Record<string, AfterChangeHandler<R>[]> = {}
	private beforeDeleteHandlers: Record<string, BeforeDeleteHandler<R>[]> = {}
	private afterDeleteHandlers: Record<string, AfterDeleteHandler<R>[]> = {}

	onBeforeCreate(record: R, source: ChangeSource): R {
		const handlers = this.beforeCreateHandlers[record.typeName]
		if (handlers) {
			let r = record
			for (const handler of handlers) {
				r = handler(r, source)
			}
			return r
		}

		return record
	}

	onAfterCreate(record: R, source: ChangeSource) {
		const handlers = this.afterCreateHandlers[record.typeName]
		if (handlers) {
			for (const handler of handlers) {
				handler(record, source)
			}
		}
	}

	onBeforeChange(prev: R, next: R, source: ChangeSource): R {
		const handlers = this.beforeChangeHandlers[next.typeName]
		if (handlers) {
			let r = next
			for (const handler of handlers) {
				r = handler(prev, r, source)
			}
			return r
		}

		return next
	}

	onAfterChange(prev: R, next: R, source: ChangeSource) {
		this.updateDepth++

		if (this.updateDepth > 1000) {
			console.error('[onAfterChange] Maximum update depth exceeded, bailing out.')
		} else {
			const handlers = this.afterChangeHandlers[next.typeName]
			if (handlers) {
				for (const handler of handlers) {
					handler(prev, next, source)
				}
			}
		}

		this.updateDepth--
	}

	onBeforeDelete(record: R, source: ChangeSource) {
		const handlers = this.beforeDeleteHandlers[record.typeName]
		if (handlers) {
			for (const handler of handlers) {
				if (handler(record, source) === false) {
					return false
				}
			}
		}
		return undefined
	}

	onAfterDelete(record: R, source: ChangeSource) {
		const handlers = this.afterDeleteHandlers[record.typeName]
		if (handlers) {
			for (const handler of handlers) {
				handler(record, source)
			}
		}
	}

	registerBeforeCreateHandler<T extends R['typeName']>(
		typeName: T,
		handler: BeforeCreateHandler<R & { typeName: T }>
	) {
		let handlers = this.beforeCreateHandlers[typeName] as BeforeCreateHandler<any>[]
		if (!handlers) {
			handlers = []
			this.beforeCreateHandlers[typeName] = handlers
		}
		handlers.push(handler)
		return () => removeFromArray(this.beforeCreateHandlers[typeName]!, handler as any)
	}

	registerAfterCreateHandler<T extends R['typeName']>(
		typeName: T,
		handler: AfterCreateHandler<R & { typeName: T }>
	) {
		let handlers = this.afterCreateHandlers[typeName] as AfterCreateHandler<any>[]
		if (!handlers) {
			handlers = []
			this.afterCreateHandlers[typeName] = handlers
		}
		handlers.push(handler)
		return () => removeFromArray(this.afterCreateHandlers[typeName]!, handler as any)
	}

	registerBeforeChangeHandler<T extends R['typeName']>(
		typeName: T,
		handler: BeforeChangeHandler<R & { typeName: T }>
	) {
		let handlers = this.beforeChangeHandlers[typeName] as BeforeChangeHandler<any>[]
		if (!handlers) {
			handlers = []
			this.beforeChangeHandlers[typeName] = handlers
		}
		handlers.push(handler)
		return () => removeFromArray(this.beforeChangeHandlers[typeName]!, handler as any)
	}

	registerAfterChangeHandler<T extends R['typeName']>(
		typeName: T,
		handler: AfterChangeHandler<R & { typeName: T }>
	) {
		let handlers = this.afterChangeHandlers[typeName] as AfterChangeHandler<any>[]
		if (!handlers) {
			handlers = []
			this.afterChangeHandlers[typeName] = handlers
		}
		handlers.push(handler as AfterChangeHandler<any>)
		return () => removeFromArray(this.afterChangeHandlers[typeName]!, handler as any)
	}

	registerBeforeDeleteHandler<T extends R['typeName']>(
		typeName: T,
		handler: BeforeDeleteHandler<R & { typeName: T }>
	) {
		let handlers = this.beforeDeleteHandlers[typeName] as BeforeDeleteHandler<any>[]
		if (!handlers) {
			handlers = []
			this.beforeDeleteHandlers[typeName] = handlers
		}
		handlers.push(handler as BeforeDeleteHandler<any>)
		return () => removeFromArray(this.beforeDeleteHandlers[typeName]!, handler as any)
	}

	registerAfterDeleteHandler<T extends R['typeName']>(
		typeName: T,
		handler: AfterDeleteHandler<R & { typeName: T }>
	) {
		let handlers = this.afterDeleteHandlers[typeName] as AfterDeleteHandler<any>[]
		if (!handlers) {
			handlers = []
			this.afterDeleteHandlers[typeName] = handlers
		}
		handlers.push(handler as AfterDeleteHandler<any>)
		return () => removeFromArray(this.afterDeleteHandlers[typeName]!, handler as any)
	}
}
