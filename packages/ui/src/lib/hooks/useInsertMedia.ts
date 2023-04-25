import { ACCEPTED_ASSET_TYPE, createShapesFromFiles, useApp } from '@tldraw/editor'
import { useCallback, useEffect, useRef } from 'react'

export function useInsertMedia() {
	const app = useApp()
	const inputRef = useRef<HTMLInputElement>()

	useEffect(() => {
		const input = window.document.createElement('input')
		input.type = 'file'
		input.accept = ACCEPTED_ASSET_TYPE
		input.multiple = true
		inputRef.current = input
		async function onchange(e: Event) {
			const fileList = (e.target as HTMLInputElement).files
			if (!fileList || fileList.length === 0) return
			await createShapesFromFiles(app, Array.from(fileList), app.viewportPageBounds.center, false)
			input.value = ''
		}
		input.addEventListener('change', onchange)
		return () => {
			inputRef.current = undefined
			input.removeEventListener('change', onchange)
		}
	}, [app])

	return useCallback(() => {
		inputRef.current?.click()
	}, [inputRef])
}
