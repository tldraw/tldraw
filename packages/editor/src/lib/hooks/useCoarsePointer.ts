import { useEffect } from 'react'
import { useEditor } from './useEditor'

export function useCoarsePointer() {
	const editor = useEditor()
	useEffect(() => {
		if (window.matchMedia) {
			const mql = window.matchMedia('(pointer: coarse)')
			const handler = () => {
				editor.isCoarsePointer = mql.matches
			}
			handler()
			mql.addEventListener('change', handler)
			return () => mql.removeEventListener('change', handler)
		}
	}, [editor])
}
