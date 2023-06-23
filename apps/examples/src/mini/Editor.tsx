/* eslint-disable import/no-extraneous-dependencies */
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

export type EditorEvents<X extends Editor<any>> = {
	beforeCreate: { editor: X }
	create: { editor: X }
	update: { editor: X }
	change: { editor: X; change: HistoryEntry<EditorRecord> }
	focus: { editor: X }
	blur: { editor: X }
	destroy: { editor: X }
}

export interface EditorOptions<E extends readonly EditorExtension[]> {
	initialData?: StoreSnapshot<EditorRecord>
	extensions?: E
}

export class Editor<const E extends readonly EditorExtension[]> extends EventEmitter<{
	[K in keyof EditorEvents<Editor<E>>]: [EditorEvents<Editor<E>>[K]]
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

		this.extensions = new EditorExtensionManager<E>(this, (opts.extensions ?? []) as E)
	}

	static create<E extends readonly EditorExtension[]>(config: {
		initialData?: StoreSnapshot<EditorRecord>
		extensions?: E
	}) {
		return new Editor(config)
	}

	// Extension storage, set by extension manager

	private _extensionStorage = atom(
		'extension-storage',
		{} as ExtractStorage<E> // Record<string, E extends EditorExtension[]<infer _, infer S> ? S : never>
	)

	@computed public get storage() {
		return this._extensionStorage.value
	}

	public set storage(value: ExtractStorage<E>) {
		this._extensionStorage.set(value)
	}

	getStorage<Name extends keyof ExtractStorage<E>>(name: Name) {
		return this.storage[name] as ExtractStorage<E>[Name]
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
