import { preventDefault, useEditor } from '@tldraw/editor'
import { useCallback, useRef } from 'react'

export function useOpenMenuCloser() {
	const editor = useEditor()
	const rIsPointingToClose = useRef(false)

	const handlePointerDown = useCallback(() => {
		if (editor.openMenus.length > 0) {
			editor.updateInstanceState({ openMenus: [] })
			rIsPointingToClose.current = true
		}
	}, [editor])

	const handleClick = useCallback((e: React.MouseEvent) => {
		if (rIsPointingToClose.current) {
			preventDefault(e)
		}
		rIsPointingToClose.current = false
	}, [])

	return { handlePointerDown, handleClick }
}
