import { DEFAULT_SUPPORTED_MEDIA_TYPE_LIST, useEditor } from '@tldraw/editor'
import { useCallback, useEffect, useRef } from 'react'

export function useInsertMedia() {
	const editor = useEditor()
	const inputRef = useRef<HTMLInputElement>()

	useEffect(() => {
		const input = window.document.createElement('input')
		input.type = 'file'
		input.accept = DEFAULT_SUPPORTED_MEDIA_TYPE_LIST
		input.multiple = true
		inputRef.current = input
		async function onchange(e: Event) {
			const fileList = (e.target as HTMLInputElement).files
			if (!fileList || fileList.length === 0) return
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
	}, [editor])

	return useCallback(() => {
		inputRef.current?.click()
	}, [inputRef])
}
