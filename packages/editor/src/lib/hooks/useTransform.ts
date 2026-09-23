import { useLayoutEffect } from 'react'
import { VecLike } from '../primitives/Vec'

/**
 * Position an element by writing its `transform` directly, outside React's render output — the
 * cheap path for elements that move at pointer/presence frequency.
 * @public
 */
export function useTransform(
	ref: React.RefObject<HTMLElement | SVGElement | null>,
	x?: number,
	y?: number,
	scale?: number,
	rotate?: number,
	additionalOffset?: VecLike
) {
	// Read the offset into primitives so the effect can depend on them, not the object identity.
	const additionalOffsetX = additionalOffset?.x
	const additionalOffsetY = additionalOffset?.y

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
		if (additionalOffsetX !== undefined && additionalOffsetY !== undefined) {
			trans += ` translate(${additionalOffsetX}px, ${additionalOffsetY}px)`
		}
		elm.style.transform = trans
	}, [additionalOffsetX, additionalOffsetY, ref, rotate, scale, x, y])
}
