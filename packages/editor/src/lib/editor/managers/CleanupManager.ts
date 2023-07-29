import { TLRecord } from '@tldraw/tlschema'
import { Editor } from '../Editor'

export class CleanupManager {
	constructor(public editor: Editor) {
		editor.store.onBeforeChange = (prev, next, source) => {
			if (this._beforeChangeHandlers[next.typeName]) {
				// @ts-expect-error
				return this._beforeChangeHandlers[next.typeName](prev, next, source)
			}
			return next
		}

		let updateDepth = 0

		editor.store.onAfterChange = (prev, next, source) => {
			updateDepth++
			if (updateDepth > 1000) {
				console.error('[onAfterChange] Maximum update depth exceeded, bailing out.')
			}

			// @ts-expect-error
			this._afterChangeHandlers[next.typeName]?.(prev, next, source)

			updateDepth--
		}

		editor.store.onBeforeCreate = (record, source) => {
			if (this._beforeCreateHandlers[record.typeName]) {
				// @ts-expect-error
				return this._beforeCreateHandlers[record.typeName](record, source)
			}

			return record
		}

		editor.store.onAfterCreate = (record, source) => {
			if (this._afterCreateHandlers[record.typeName]) {
				// @ts-expect-error
				this._afterCreateHandlers[record.typeName](record, source)
			}
		}

		editor.store.onBeforeDelete = (record, source) => {
			if (this._beforeDeleteHandlers[record.typeName]) {
				// @ts-expect-error
				return this._beforeDeleteHandlers[record.typeName](record, source)
			}
		}

		editor.store.onAfterDelete = (record, source) => {
			if (this._afterDeleteHandlers[record.typeName]) {
				// @ts-expect-error
				this._afterDeleteHandlers[record.typeName](record, source)
			}
		}

		editor.history.onBatchComplete = () => {
			this._batchCompleteHandler?.()
		}
	}

	private _beforeCreateHandlers: Partial<{
		[K in TLRecord['typeName']]: (
			record: TLRecord & { typeName: K },
			source: 'remote' | 'user'
		) => TLRecord & { typeName: K }
	}> = {}
	private _afterCreateHandlers: Partial<{
		[K in TLRecord['typeName']]: (
			record: TLRecord & { typeName: K },
			source: 'remote' | 'user'
		) => void
	}> = {}
	private _beforeChangeHandlers: Partial<{
		[K in TLRecord['typeName']]: (
			prev: TLRecord & { typeName: K },
			next: TLRecord & { typeName: K },
			source: 'remote' | 'user'
		) => TLRecord & { typeName: K }
	}> = {}
	private _afterChangeHandlers: Partial<{
		[K in TLRecord['typeName']]: (
			prev: TLRecord & { typeName: K },
			next: TLRecord & { typeName: K },
			source: 'remote' | 'user'
		) => void
	}> = {}

	private _beforeDeleteHandlers: Partial<{
		[K in TLRecord['typeName']]: (
			record: TLRecord & { typeName: K },
			source: 'remote' | 'user'
		) => void | false
	}> = {}

	private _afterDeleteHandlers: Partial<{
		[K in TLRecord['typeName']]: (
			record: TLRecord & { typeName: K },
			source: 'remote' | 'user'
		) => void
	}> = {}

	private _batchCompleteHandler: (() => void) | undefined

	registerBeforeCreateHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: (
			record: TLRecord & { typeName: T },
			source: 'remote' | 'user'
		) => TLRecord & { typeName: T }
	) {
		// @ts-expect-error
		this._beforeCreateHandlers[typeName] = handler
	}

	registerAfterCreateHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: (record: TLRecord & { typeName: T }, source: 'remote' | 'user') => void
	) {
		// @ts-expect-error
		this._afterCreateHandlers[typeName] = handler
	}

	registerBeforeChangeHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: (
			prev: TLRecord & { typeName: T },
			next: TLRecord & { typeName: T },
			source: 'remote' | 'user'
		) => TLRecord & { typeName: T }
	) {
		// @ts-expect-error
		this._beforeChangeHandlers[typeName] = handler
	}

	registerAfterChangeHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: (
			prev: TLRecord & { typeName: T },
			next: TLRecord & { typeName: T },
			source: 'remote' | 'user'
		) => void
	) {
		// @ts-expect-error
		this._afterChangeHandlers[typeName] = handler
	}

	registerBeforeDeleteHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: (record: TLRecord & { typeName: T }, source: 'remote' | 'user') => void | false
	) {
		// @ts-expect-error
		this._beforeDeleteHandlers[typeName] = handler
	}

	registerAfterDeleteHandler<T extends TLRecord['typeName']>(
		typeName: T,
		handler: (record: TLRecord & { typeName: T }, source: 'remote' | 'user') => void
	) {
		// @ts-expect-error
		this._afterDeleteHandlers[typeName] = handler
	}

	registerBatchCompleteHandler(handler: () => void) {
		this._batchCompleteHandler = handler
	}
}
