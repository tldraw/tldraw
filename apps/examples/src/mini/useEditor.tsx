import { DependencyList, useEffect, useRef, useState } from 'react'
import { Editor, EditorEvents, EditorOptions } from './editor-core'

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

export function useEditor(options = {} as UseEditorOptions, deps: DependencyList = []) {
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
