import { useEffect } from 'react'
import { preventDefault } from 'tldraw'

export function usePreventAccidentalDrops() {
	useEffect(() => {
		function stopDrop(e: DragEvent) {
			if ((e as any).isSpecialRedispatchedEvent) return
			preventDefault(e)
		}
		document.addEventListener('dragover', stopDrop)
		document.addEventListener('drop', stopDrop)
		return () => {
			document.removeEventListener('dragover', stopDrop)
			document.removeEventListener('drop', stopDrop)
		}
	}, [])
}
