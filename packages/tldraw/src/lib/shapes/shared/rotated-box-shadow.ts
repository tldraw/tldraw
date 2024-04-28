import { Vec } from '@tldraw/editor'
import { tldrawConstants } from '../../tldraw-constants'
const { ROTATING_BOX_SHADOWS } = tldrawConstants

/** @public */
export function getRotatedBoxShadow(rotation: number) {
	const cssStrings = ROTATING_BOX_SHADOWS.map((shadow) => {
		const { offsetX, offsetY, blur, spread, color } = shadow
		const vec = new Vec(offsetX, offsetY)
		const { x, y } = vec.rot(-rotation)
		return `${x}px ${y}px ${blur}px ${spread}px ${color}`
	})
	return cssStrings.join(', ')
}
