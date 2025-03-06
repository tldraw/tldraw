import {
	DEFAULT_SUPPORTED_MEDIA_TYPE_LIST,
	Editor,
	useMaybeEditor,
	useShallowArrayIdentity,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useRef } from 'react'

export const MimeTypeContext = React.createContext<string[] | undefined>([])

export function useInsertMedia() {
	const _editor = useMaybeEditor()
	const inputRef = useRef<HTMLInputElement>()
	const mimeTypes = useShallowArrayIdentity(React.useContext(MimeTypeContext))

	useEffect(() => {
		const editor = _editor as Editor
		if (!editor) return

		const input = window.document.createElement('input')
		input.type = 'file'
		input.accept = mimeTypes?.join(',') ?? DEFAULT_SUPPORTED_MEDIA_TYPE_LIST
		input.multiple = true
		inputRef.current = input
		async function onchange(e: Event) {
			const fileList = (e.target as HTMLInputElement).files
			if (!fileList || fileList.length === 0) return
			editor.markHistoryStoppingPoint('insert media')
			await editor.putExternalContent({
				type: 'files',
				files: Array.from(fileList),
				point: editor.getViewportPageBounds().center,
				ignoreParent: false,
			})
			input.value = ''
		}
		input.addEventListener('change', onchange)
		return () => {
			inputRef.current = undefined
			input.removeEventListener('change', onchange)
		}
	}, [_editor, mimeTypes])

	return useCallback(() => {
		inputRef.current?.click()
	}, [inputRef])
}
