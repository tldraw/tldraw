import { BoxModel } from '@tldraw/tlschema'
import { Box } from '../../primitives/Box'

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
export type TLCameraOptions = {
	/** The bounds of the content (in page space) */
	bounds: BoxModel | null
	/** The padding around the bounds (in screen space) */
	padding: number | number[]
	/** The maximum elastic distance around the bounds */
	elastic: number
	/** The speed of a scroll wheel / trackpad pan */
	panSpeed: number
	/** The speed of a scroll wheel / trackpad zoom */
	zoomSpeed: number
	/** The steps that a user can zoom between with zoom in / zoom out (zoom factors) */
	zoomSteps: number[] | null
	/** A minimum zoom factor (e.g. .5x of the zoom at which the shape is fully on screen) */
	zoomMin: number
	/** A maximum zoom factor (e.g. 2x of the zoom at which the shape is fully on screen) */
	zoomMax: number
	/** Whether the camera is locked */
	isLocked: boolean
}
