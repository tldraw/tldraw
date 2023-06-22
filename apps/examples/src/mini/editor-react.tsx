/* ---------------------- React --------------------- */

import { DependencyList, createContext, useContext, useEffect, useRef, useState } from 'react'
import { Editor, EditorEvents, EditorOptions } from './Editor'
import { EditorExtension } from './EditorExtension'

export interface EditorEventOptions<E extends EditorExtension[]> {
	onBeforeCreate?: (props: EditorEvents<E>['beforeCreate']) => void | null
	onCreate?: (props: EditorEvents<E>['create']) => void | null
	onUpdate?: (props: EditorEvents<E>['update']) => void | null
	onChange?: (props: EditorEvents<E>['change']) => void | null
	onFocus?: (props: EditorEvents<E>['focus']) => void | null
	onBlur?: (props: EditorEvents<E>['blur']) => void | null
	onDestroy?: (props: EditorEvents<E>['destroy']) => void | null
}

// Editor
export type UseEditorOptions<E extends EditorExtension[]> = EditorOptions<E> & EditorEventOptions<E>

export function useEditor<E extends EditorExtension[]>(
	options = {} as UseEditorOptions<E>,
	deps: DependencyList = []
) {
	const [editor, setEditor] = useState<Editor<E> | null>(null)

	const { initialData, extensions } = options

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

	useEffect(() => {
		const instance = Editor.create({
			initialData,
			extensions,
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

const editorContext = createContext(undefined as any as Editor<any>)

export function EditorProvider<E extends EditorExtension[]>({
	editor,
	children,
}: {
	editor: Editor<E> | null
	children?: any
}) {
	if (!editor) return null
	return <editorContext.Provider value={editor}>{children}</editorContext.Provider>
}

export function useEditorContext<E extends EditorExtension[]>() {
	return useContext(editorContext) as Editor<E>
}
