import { atom, computed } from '@tldraw/state'
import { HistoryEntry, Store, StoreSchema, StoreSnapshot } from '@tldraw/store'
import { EventEmitter } from 'eventemitter3'
import { EditorExtension, ExtractStorage } from './EditorExtension'
import { EditorExtensionManager } from './EditorExtensionManager'
import {
	EditorRecord,
	EditorStoreProps,
	editorStateRecordType,
	pageRecordType,
	pageStateRecordType,
	shapeRecordType,
} from './editor-schema'

// Editor events

export type EditorEvents<E extends EditorExtension> = {
	beforeCreate: { editor: Editor<E> }
	create: { editor: Editor<E> }
	update: { editor: Editor<E> }
	change: { editor: Editor<E>; change: HistoryEntry<EditorRecord> }
	focus: { editor: Editor<E> }
	blur: { editor: Editor<E> }
	destroy: { editor: Editor<E> }
}

export interface EditorOptions<E extends EditorExtension> {
	initialData?: StoreSnapshot<EditorRecord>
	extensions?: E[]
}

export class Editor<E extends EditorExtension> extends EventEmitter<{
	[K in keyof EditorEvents<E>]: [EditorEvents<E>[K]]
}> {
	store: Store<EditorRecord, EditorStoreProps>

	extensions: EditorExtensionManager<E>

	constructor(opts: EditorOptions<E>) {
		super()

		const schema = StoreSchema.create<EditorRecord, EditorStoreProps>({
			[editorStateRecordType.typeName]: editorStateRecordType,
			[pageStateRecordType.typeName]: pageStateRecordType,
			[pageRecordType.typeName]: pageRecordType,
			[shapeRecordType.typeName]: shapeRecordType,
		})

		this.store = new Store({
			initialData: opts.initialData,
			schema,
			props: {},
		})

		this.extensions = new EditorExtensionManager(this, opts.extensions ?? [])
	}

	static create<E extends EditorExtension>(config: {
		initialData?: StoreSnapshot<EditorRecord>
		extensions?: E[]
	}) {
		return new Editor(config)
	}

	// Extension storage, set by extension manager

	private _extensionStorage = atom(
		'extension-storage',
		{} as ExtractStorage<E> // Record<string, E extends EditorExtension<infer _, infer S> ? S : never>
	)

	@computed public get storage() {
		return this._extensionStorage.value
	}

	public set storage(value: ExtractStorage<E>) {
		this._extensionStorage.set(value)
	}

	/**
	 * Destroy the editor.
	 *
	 * ```ts
	 * editor.destroy()
	 * ```
	 *
	 * @public
	 */
	public destroy = () => {
		this.emit('destroy', { editor: this })

		this.removeAllListeners()
	}

	/**
	 * Check if the editor is already destroyed.
	 *
	 * @public
	 */
	public get isDestroyed(): boolean {
		// @ts-ignore
		return !this.view?.docView
	}
}
