import { DEFAULT_SUPPORTED_MEDIA_TYPE_LIST, TLShapeId, useEditor } from '@tldraw/editor'
import { useCallback, useEffect, useRef } from 'react'

export function useInsertMedia({ shapeIdToReplace }: { shapeIdToReplace?: TLShapeId } = {}) {
	const editor = useEditor()
	const inputRef = useRef<HTMLInputElement>()

	useEffect(() => {
		const input = window.document.createElement('input')
		input.type = 'file'
		input.accept = DEFAULT_SUPPORTED_MEDIA_TYPE_LIST
		input.multiple = !shapeIdToReplace
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
				shapeIdToReplace,
			})
			input.value = ''
		}
		input.addEventListener('change', onchange)
		return () => {
			inputRef.current = undefined
			input.removeEventListener('change', onchange)
		}
	}, [editor, shapeIdToReplace])

	return useCallback(() => {
		inputRef.current?.click()
	}, [inputRef])
}
