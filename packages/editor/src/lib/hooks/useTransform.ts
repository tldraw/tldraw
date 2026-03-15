import { useLayoutEffect } from 'react'
import { VecLike } from '../primitives/Vec'

/** @public */
export function setTransform(
	elm: HTMLElement | SVGElement | null,
	x?: number,
	y?: number,
	scale?: number,
	rotate?: number,
	offsetX?: number,
	offsetY?: number
) {
	if (!elm) return
	if (x === undefined) return

	let trans = `translate(${x}px, ${y}px)`
	if (scale !== undefined) {
		trans += ` scale(${scale})`
	}
	if (rotate !== undefined) {
		trans += ` rotate(${rotate}rad)`
	}
	if (offsetX !== undefined && offsetY !== undefined) {
		trans += ` translate(${offsetX}px, ${offsetY}px)`
	}
	elm.style.transform = trans
}

/** @public */
export function useTransform(
	ref: React.RefObject<HTMLElement | SVGElement | null>,
	x?: number,
	y?: number,
	scale?: number,
	rotate?: number,
	additionalOffset?: VecLike
) {
	useLayoutEffect(() => {
		setTransform(ref.current, x, y, scale, rotate, additionalOffset?.x, additionalOffset?.y)
	})
}
