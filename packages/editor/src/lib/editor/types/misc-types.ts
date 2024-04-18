import { BoxModel } from '@tldraw/tlschema'
import { Box } from '../../primitives/Box'
import { VecLike } from '../../primitives/Vec'

/** @public */
export type RequiredKeys<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>
/** @public */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/** @public */
export type TLSvgOptions = {
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
export type TLCameraOptions = {
	wheelBehavior: 'zoom' | 'pan' | 'none'
	/** The speed of a scroll wheel / trackpad pan */
	panSpeed: number
	/** The speed of a scroll wheel / trackpad zoom */
	zoomSpeed: number
	/** The steps that a user can zoom between with zoom in / zoom out (zoom factors) */
	zoomSteps: number[]
	/** Whether the camera is locked */
	isLocked: boolean
	/** The camera constraints */
	constraints?: {
		/** Which dimension to fit when the camera is reset. */
		resetDimension: 'min' | 'max' | 'x' | 'y' | 'none'
		/** The behavior for the constraints on the x axis. */
		fitX: 'contain' | 'inside' | 'outside' | 'lock'
		/** The behavior for the constraints on the y axis. */
		fitY: 'contain' | 'inside' | 'outside' | 'lock'
		/** The bounds of the content (in page space) */
		bounds: BoxModel
		/** The padding around the bounds (in screen space). Provide a number for x and y, or [x, y]. */
		padding: VecLike
		/** The origin for placement when the bounds are smaller than the viewport. Provide a number for x and y, or [x, y].*/
		origin: VecLike
	}
}
