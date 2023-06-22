import {
	BaseRecord,
	HistoryEntry,
	IdOf,
	RecordId,
	Store,
	StoreSchema,
	StoreSnapshot,
	UnknownRecord,
	createRecordType,
} from '@tldraw/store'
import { Editor, useEditor } from '@tldraw/tldraw'
import { T } from '@tldraw/validate'
import { EventEmitter } from 'eventemitter3'
import { DependencyList, createContext, useEffect, useRef, useState } from 'react'

export function idValidator<R extends UnknownRecord>(
	prefix: IdOf<R>['__type__']['typeName']
): T.Validator<R['id']> {
	const _prefix = `${prefix}:`
	return new T.Validator((value: unknown) => {
		if (!(typeof value === 'string' && value.startsWith(_prefix))) {
			throw new T.ValidationError('Uh oh')
		}

		return value as R['id']
	})
}

// Page

interface PageRecord extends BaseRecord<'page', PageRecordId> {
	name: string
}

type PageRecordId = RecordId<PageRecord>

const pageRecordType = createRecordType<PageRecord>('page', {
	scope: 'document',
}).withDefaultProperties(() => ({
	name: 'Page',
}))

// Shape

interface ShapeRecord extends BaseRecord<'shape', ShapeRecordId> {
	pageId: PageRecordId
	x: number
	y: number
}

type ShapeRecordId = RecordId<ShapeRecord>

const shapeRecordType = createRecordType<ShapeRecord>('shape', {
	scope: 'document',
}).withDefaultProperties(() => ({
	x: 0,
	y: 0,
}))

// Page State

interface PageStateRecord extends BaseRecord<'page-state', PageStateRecordId> {
	selectedShapeIds: ShapeRecordId[]
}

type PageStateRecordId = RecordId<PageStateRecord>

const pageStateRecordType = createRecordType<PageStateRecord>('page-state', {
	scope: 'session',
	validator: T.object({
		id: idValidator<PageStateRecord>('page-state'),
		typeName: T.literal('page-state'),
		selectedShapeIds: T.arrayOf(idValidator<ShapeRecord>('shape')),
	}),
}).withDefaultProperties(() => ({
	selectedShapeIds: [],
}))

// Editor State

interface EditorStateRecord extends BaseRecord<'editor-state', EditorStateRecordId> {
	currentPageId: PageRecordId
}

type EditorStateRecordId = RecordId<EditorStateRecord>

const editorStateRecordType = createRecordType<EditorStateRecord>('editor-state', {
	scope: 'session',
	validator: T.object({
		id: idValidator<EditorStateRecord>('editor-state'),
		typeName: T.literal('editor-state'),
		currentPageId: idValidator<PageRecord>('page'),
	}),
})

// All records

type EditorRecord = EditorStateRecord | PageStateRecord | PageRecord | ShapeRecord

type EditorStoreProps = any

// Editor events

type EditorEvents = {
	beforeCreate: { editor: Editor }
	create: { editor: Editor }
	update: { editor: Editor }
	change: { editor: Editor; change: HistoryEntry<EditorRecord> }
	focus: { editor: Editor }
	blur: { editor: Editor }
	destroy: { editor: Editor }
}

/* ------------------- Extension ------------------- */

// an extension could be anything... it can hook into the events in the
// editor, set keyboard shortcuts, etc. Maybe we can scope this down further...

type EditorExtensionOptions<Options = any> = {
	/**
	 * Additional options
	 */
	options?: Options

	/**
	 * Name
	 */
	name: string
} & EditorEventOptions

class EditorExtension<Options = any> {
	constructor(public readonly config: EditorExtensionOptions<Options>) {}
}

/* ---------------- Extension manager --------------- */

class EditorExtensionManager {
	constructor(public readonly editor: Editor, public readonly extensions: EditorExtension[]) {
		for (const extension of extensions) {
			const { config } = extension

			if (config.onBeforeCreate) {
				this.editor.addListener('beforeCreate', config.onBeforeCreate)
			}
			if (config.onCreate) {
				this.editor.addListener('create', config.onCreate)
			}
			if (config.onUpdate) {
				this.editor.addListener('update', config.onUpdate)
			}
			if (config.onChange) {
				this.editor.addListener('change', config.onChange)
			}
			if (config.onFocus) {
				this.editor.addListener('focus', config.onFocus)
			}
			if (config.onBlur) {
				this.editor.addListener('blur', config.onBlur)
			}
			if (config.onDestroy) {
				this.editor.addListener('destroy', config.onDestroy)
			}
		}
	}

	static dedupe(extensions: EditorExtension[]) {
		const names = new Set()
		for (const {
			config: { name },
		} of extensions) {
			if (names.has(name)) {
				throw Error(`[Editor] Cannot have two extensions with the name: "${name}"`)
			}
			names.add(name)
		}
	}
}

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

/* ---------------------- React --------------------- */

function useForceUpdate() {
	const [, setValue] = useState(0)
	return () => setValue((value) => value + 1)
}

interface EditorEventOptions {
	onBeforeCreate?: (props: EditorEvents['beforeCreate']) => void | null
	onCreate?: (props: EditorEvents['create']) => void | null
	onUpdate?: (props: EditorEvents['update']) => void | null
	onChange?: (props: EditorEvents['change']) => void | null
	onFocus?: (props: EditorEvents['focus']) => void | null
	onBlur?: (props: EditorEvents['blur']) => void | null
	onDestroy?: (props: EditorEvents['destroy']) => void | null
}

// Editor
type UseEditorOptions = EditorOptions & EditorEventOptions

function useEditor(options = {} as UseEditorOptions, deps: DependencyList = []) {
	const [editor, setEditor] = useState<Editor | null>(null)

	useEffect(() => {
		const instance = new Editor({ initialData })
		setEditor(instance)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)

	// Set up options
	const { onBeforeCreate, onBlur, onCreate, onDestroy, onFocus, onChange, onUpdate } = options

	const onBeforeCreateRef = useRef(onBeforeCreate)
	const onBlurRef = useRef(onBlur)
	const onCreateRef = useRef(onCreate)
	const onDestroyRef = useRef(onDestroy)
	const onFocusRef = useRef(onFocus)
	const onChangeRef = useRef(onChange)
	const onUpdateRef = useRef(onUpdate)

	useEffect(() => {
		if (!editor) {
			return
		}

		if (onBeforeCreate) {
			editor.off('beforeCreate', onBeforeCreateRef.current)
			editor.on('beforeCreate', onBeforeCreate)
			onBeforeCreateRef.current = onBeforeCreate
		}

		if (onBlur) {
			editor.off('blur', onBlurRef.current)
			editor.on('blur', onBlur)
			onBlurRef.current = onBlur
		}

		if (onCreate) {
			editor.off('create', onCreateRef.current)
			editor.on('create', onCreate)
			onCreateRef.current = onCreate
		}

		if (onDestroy) {
			editor.off('destroy', onDestroyRef.current)
			editor.on('destroy', onDestroy)
			onDestroyRef.current = onDestroy
		}

		if (onFocus) {
			editor.off('focus', onFocusRef.current)
			editor.on('focus', onFocus)
			onFocusRef.current = onFocus
		}

		if (onChange) {
			editor.off('change', onChangeRef.current)
			editor.on('change', onChange)
			onChangeRef.current = onChange
		}

		if (onUpdate) {
			editor.off('update', onUpdateRef.current)
			editor.on('update', onUpdate)
			onUpdateRef.current = onUpdate
		}
	}, [onBeforeCreate, onBlur, onCreate, onDestroy, onFocus, onChange, onUpdate, editor])

	const { initialData } = options

	useEffect(() => {
		const instance = new Editor({
			initialData,
		})
		setEditor(instance)

		return () => {
			instance.destroy()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)

	return editor
}

// Editor context

const editorContext = createContext(undefined as any as Editor)

function EditorProvider({ editor, children }: { editor: Editor | null; children?: any }) {
	if (!editor) return null
	return <editorContext.Provider value={editor}>{children}</editorContext.Provider>
}

// Sync context

// function SyncExtension({ editor }: { editor: Editor | null }) {
// 	if (!)
// }

function Example() {
	const editor = useEditor()
	return <EditorProvider editor={editor}></EditorProvider>
}
