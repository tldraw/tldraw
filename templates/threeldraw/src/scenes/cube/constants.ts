export const FACE_SIZE = 800

/**
 * How much the cube fills the viewport. 1 = cube diagonal exactly fits,
 * >1 = cube overflows (crops edges), <1 = background visible.
 * The canvas zoom is derived from this automatically.
 */
export const CUBE_FILL = 2

/** Orthographic frustum size derived from CUBE_FILL.
 *  The isometric diagonal of the cube is FACE_SIZE * √2 ≈ 1131.
 *  frustum = diagonal / CUBE_FILL */
export const CUBE_FRUSTUM = (FACE_SIZE * Math.SQRT2) / CUBE_FILL

/** Canvas zoom — smaller frustum means we need proportionally smaller zoom
 *  to keep the same page-space coverage per face. */
export const CUBE_ZOOM = CUBE_FRUSTUM / (FACE_SIZE * 2)
export type FaceName = 'left' | 'right' | 'floor'
export const FACE_NAMES: FaceName[] = ['left', 'right', 'floor']

const FACE_FLIPS: Record<FaceName, { flipX: boolean; flipY: boolean }> = {
	left: { flipX: false, flipY: false },
	right: { flipX: false, flipY: false },
	floor: { flipX: false, flipY: false },
}

// Each face shows FACE_SIZE screen pixels, which at the editor's CUBE_ZOOM
// corresponds to FACE_SIZE / CUBE_ZOOM page units. Spacing the page origins
// by this amount ensures adjacent faces show non-overlapping page regions.
const FACE_PAGE_STEP = FACE_SIZE / CUBE_ZOOM

export const FACE_PAGE_ORIGINS: Record<FaceName, { x: number; y: number }> = {
	left: { x: -FACE_PAGE_STEP, y: 0 },
	right: { x: 0, y: 0 },
	floor: { x: 0, y: FACE_PAGE_STEP },
}

export function normalizeFacePoint(faceName: FaceName, localX: number, localY: number) {
	const { flipX, flipY } = FACE_FLIPS[faceName]
	return {
		localX: flipX ? FACE_SIZE - localX : localX,
		localY: flipY ? FACE_SIZE - localY : localY,
	}
}

export function getFaceContentTransform(faceName: FaceName) {
	const { flipX, flipY } = FACE_FLIPS[faceName]
	const tx = flipX ? FACE_SIZE : 0
	const ty = flipY ? FACE_SIZE : 0
	const sx = flipX ? -1 : 1
	const sy = flipY ? -1 : 1

	return `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`
}
