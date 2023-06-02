import { useEffect } from 'react'
import { useEditor } from './useEditor'

export function useCoarsePointer() {
	const app = useEditor()
	useEffect(() => {
		if (window.matchMedia) {
			const mql = window.matchMedia('(pointer: coarse)')
			const handler = () => {
				app.isCoarsePointer = mql.matches
			}
			handler()
			mql.addEventListener('change', handler)
			return () => mql.removeEventListener('change', handler)
		}
	}, [app])
}
