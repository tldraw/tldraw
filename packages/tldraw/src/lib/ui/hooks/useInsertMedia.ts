import {
	DEFAULT_SUPPORTED_MEDIA_TYPE_LIST,
	Editor,
	useMaybeEditor,
	useShallowArrayIdentity,
} from '@tldraw/editor'
import { createContext, useCallback, useContext, useEffect, useRef } from 'react'

export const MimeTypeContext = createContext<string[] | undefined>([])

export function useInsertMedia(options?: {
	callbackFn?(editor: Editor, files: File[]): void
	allowMultiple: boolean
}) {
	const { callbackFn, allowMultiple = true } = options || {}
	const _editor = useMaybeEditor()
	const inputRef = useRef<HTMLInputElement>()
	const mimeTypes = useShallowArrayIdentity(useContext(MimeTypeContext))

	useEffect(() => {
		const editor = _editor as Editor
		if (!editor) return

		const input = document.createElement('input')
		input.type = 'file'
		input.accept = mimeTypes?.join(',') ?? DEFAULT_SUPPORTED_MEDIA_TYPE_LIST
		input.multiple = allowMultiple
		inputRef.current = input

		async function onchange(e: Event) {
			const fileList = (e.target as HTMLInputElement).files
			if (!fileList || fileList.length === 0) return
			editor.markHistoryStoppingPoint('insert media')
			const files = Array.from(fileList)
			if (callbackFn) {
				await callbackFn(editor, files)
			} else {
				await editor.putExternalContent({
					type: 'files',
					files,
					point: editor.getViewportPageBounds().center,
				})
			}
			input.value = ''
		}

		input.addEventListener('change', onchange)

		return () => {
			inputRef.current = undefined
			input.removeEventListener('change', onchange)
		}
	}, [_editor, callbackFn, allowMultiple, mimeTypes])

	return useCallback(() => {
		inputRef.current?.click()
	}, [inputRef])
}
