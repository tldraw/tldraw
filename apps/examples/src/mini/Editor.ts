import { Store, StoreSchema, StoreSnapshot } from '@tldraw/store'
import EventEmitter from 'events'
import {
	editorStateRecordType,
	pageRecordType,
	pageStateRecordType,
	shapeRecordType,
} from './EditorSchema'

interface EditorOptions {
	initialData?: StoreSnapshot<EditorRecord>
	extensions?: EditorExtension[]
}

class Editor extends EventEmitter<{ [K in keyof EditorEvents]: [EditorEvents[K]] }> {
	store: Store<EditorRecord, EditorStoreProps>

	extensions: EditorExtensionManager

	constructor(opts: EditorOptions) {
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
