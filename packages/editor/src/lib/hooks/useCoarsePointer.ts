import { useEffect } from 'react'
import { useApp } from './useEditor'

export function useCoarsePointer() {
	const app = useApp()
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
