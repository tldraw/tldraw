import { useLayoutEffect } from 'react'
import { VecLike } from '../primitives/Vec2d'

/** @public */
export function useTransform(
	ref: React.RefObject<HTMLElement | SVGElement>,
	x?: number,
	y?: number,
	scale?: number,
	rotate?: number,
	additionalOffset?: VecLike
) {
	useLayoutEffect(() => {
		const elm = ref.current
		if (!elm) return
		if (x === undefined) return

		let trans = `translate(${x}px, ${y}px)`
		if (scale !== undefined) {
			trans += ` scale(${scale})`
		}
		if (rotate !== undefined) {
			trans += ` rotate(${rotate}rad)`
		}
		if (additionalOffset) {
			trans += ` translate(${additionalOffset.x}px, ${additionalOffset.y}px)`
		}
		elm.style.transform = trans
	})
}
