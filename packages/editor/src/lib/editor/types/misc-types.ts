import { BoxModel } from '@tldraw/tlschema'
import { Box } from '../../primitives/Box'
import { VecLike } from '../../primitives/Vec'

/** @public */
export type RequiredKeys<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>
/** @public */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/** @public */
export interface TLSvgOptions {
	bounds: Box
	scale: number
	background: boolean
	padding: number
	darkMode?: boolean
	preserveAspectRatio: React.SVGAttributes<SVGSVGElement>['preserveAspectRatio']
}

/** @public */
export type TLCameraMoveOptions = Partial<{
	/** Whether to move the camera immediately, rather than on the next tick. */
	immediate: boolean
	/** Whether to force the camera to move, even if the user's camera options have locked the camera. */
	force: boolean
	/** Whether to reset the camera to its default position and zoom. */
	reset: boolean
	/** An (optional) animation to use. */
	animation: Partial<{
		/** The time the animation should take to arrive at the specified camera coordinates. */
		duration: number
		/** An easing function to apply to the animation's progress from start to end. */
		easing: (t: number) => number
	}>
}>

/** @public */
export interface TLCameraOptions {
	/** Whether the camera is locked. */
	isLocked: boolean
	/** The speed of a scroll wheel / trackpad pan. Default is 1. */
	panSpeed: number
	/** The speed of a scroll wheel / trackpad zoom. Default is 1. */
	zoomSpeed: number
	/** The steps that a user can zoom between with zoom in / zoom out. The first and last value will determine the min and max zoom. */
	zoomSteps: number[]
	/** Controls whether the wheel pans or zooms.
	 *
	 * - `zoom`: The wheel will zoom in and out.
	 * - `pan`: The wheel will pan the camera.
	 * - `none`: The wheel will do nothing.
	 */
	wheelBehavior: 'zoom' | 'pan' | 'none'
	/** The camera constraints. */
	constraints?: TLCameraConstraints
}

/** @public */
export interface TLCameraConstraints {
	/** The bounds (in page space) of the constrained space */
	bounds: BoxModel
	/** The padding inside of the viewport (in screen space) */
	padding: VecLike
	/** The origin for placement. Used to position the bounds within the viewport when an axis is fixed or contained and zoom is below the axis fit. */
	origin: VecLike
	/** The camera's initial zoom, used also when the camera is reset.
	 *
	 * - `default`: Sets the initial zoom to 100%.
	 * - `fit-x`: The x axis will completely fill the viewport bounds.
	 * - `fit-y`: The y axis will completely fill the viewport bounds.
	 * - `fit-min`: The smaller axis will completely fill the viewport bounds.
	 * - `fit-max`: The larger axis will completely fill the viewport bounds.
	 * - `fit-x-100`: The x axis will completely fill the viewport bounds, or 100% zoom, whichever is smaller.
	 * - `fit-y-100`: The y axis will completely fill the viewport bounds, or 100% zoom, whichever is smaller.
	 * - `fit-min-100`: The smaller axis will completely fill the viewport bounds, or 100% zoom, whichever is smaller.
	 * - `fit-max-100`: The larger axis will completely fill the viewport bounds, or 100% zoom, whichever is smaller.
	 */
	initialZoom:
		| 'fit-min'
		| 'fit-max'
		| 'fit-x'
		| 'fit-y'
		| 'fit-min-100'
		| 'fit-max-100'
		| 'fit-x-100'
		| 'fit-y-100'
		| 'default'
	/** The camera's base for its zoom steps.
	 *
	 * - `default`: Sets the initial zoom to 100%.
	 * - `fit-x`: The x axis will completely fill the viewport bounds.
	 * - `fit-y`: The y axis will completely fill the viewport bounds.
	 * - `fit-min`: The smaller axis will completely fill the viewport bounds.
	 * - `fit-max`: The larger axis will completely fill the viewport bounds.
	 * - `fit-x-100`: The x axis will completely fill the viewport bounds, or 100% zoom, whichever is smaller.
	 * - `fit-y-100`: The y axis will completely fill the viewport bounds, or 100% zoom, whichever is smaller.
	 * - `fit-min-100`: The smaller axis will completely fill the viewport bounds, or 100% zoom, whichever is smaller.
	 * - `fit-max-100`: The larger axis will completely fill the viewport bounds, or 100% zoom, whichever is smaller.
	 */
	baseZoom:
		| 'fit-min'
		| 'fit-max'
		| 'fit-x'
		| 'fit-y'
		| 'fit-min-100'
		| 'fit-max-100'
		| 'fit-x-100'
		| 'fit-y-100'
		| 'default'
	/** The behavior for the constraints for both axes or each axis individually.
	 *
	 * - `free`: The bounds are ignored when moving the camera.
	 * - 'fixed': The bounds will be positioned within the viewport based on the origin
	 * - `contain`: The 'fixed' behavior will be used when the zoom is below the zoom level at which the bounds would fill the viewport; and when above this zoom, the bounds will use the 'inside' behavior.
	 * - `inside`: The bounds will stay completely within the viewport.
	 * - `outside`: The bounds will stay touching the viewport.
	 */
	behavior:
		| 'free'
		| 'fixed'
		| 'inside'
		| 'outside'
		| 'contain'
		| {
				x: 'free' | 'fixed' | 'inside' | 'outside' | 'contain'
				y: 'free' | 'fixed' | 'inside' | 'outside' | 'contain'
		  }
}
