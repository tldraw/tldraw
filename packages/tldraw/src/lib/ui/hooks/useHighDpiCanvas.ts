import { useLayoutEffect } from 'react'

/** @internal */
export function useHighDpiCanvas(ref: React.RefObject<HTMLCanvasElement>, dpr: number) {
	// Match the resolution of the client
	useLayoutEffect(() => {
		const canvas = ref.current
		if (!canvas) return

		const rect = canvas.getBoundingClientRect()
		canvas.width = rect.width * dpr
		canvas.height = rect.height * dpr
	}, [ref, dpr])
}
