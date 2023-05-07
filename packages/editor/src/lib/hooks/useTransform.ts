import { useLayoutEffect } from 'react'

export function useTransform(
	ref: React.RefObject<HTMLElement | SVGElement>,
	x?: number,
	y?: number,
	scale?: number,
	rotate?: number
) {
	useLayoutEffect(() => {
		const elm = ref.current
		if (!elm) return
		if (x === undefined) return

		if (scale !== undefined) {
			if (rotate !== undefined) {
				elm.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`
			} else {
				elm.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
			}
		} else {
			elm.style.transform = `translate(${x}px, ${y}px)`
		}
	})
}
