/**
 * A serializable model for 2D vectors. Mirrors `VecModel` from `@tldraw/tlschema` so that this
 * package can stay dependency-free.
 *
 * @public
 */
export interface VecModel {
	x: number
	y: number
	z?: number
}
