import { BoxModel, TLShape } from '@tldraw/tlschema'
import { Box } from '../../primitives/Box'
import { VecLike } from '../../primitives/Vec'

/** @public */
export type RequiredKeys<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>
/** @public */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/** @public */
export type TLExportType = 'svg' | 'png' | 'jpeg' | 'webp'

/** @public */
export interface TLSvgExportOptions {
	/**
	 * The bounding box, in page coordinates, of the area being exported.
	 */
	bounds?: Box
	/**
	 * The logical scale of the export. This scales the resulting size of the SVG being generated.
	 */
	scale?: number
	/**
	 * When exporting an SVG, the expected pixel ratio of the export will be passed in to
	 * {@link @tldraw/tlschema#TLAssetStore.resolve} as the `dpr` property, so that assets can be
	 * downscaled to the appropriate resolution.
	 *
	 * When exporting to a bitmap image format, the size of the resulting image will be multiplied
	 * by this number.
	 *
	 * For SVG exports, this defaults to undefined - which means we'll request original-quality
	 * assets. For bitmap exports, this defaults to 2.
	 */
	pixelRatio?: number

	/**
	 * Should the background color be included in the export? If false, the generated image will be
	 * transparent (if exporting to a format that supports transparency).
	 */
	background?: boolean

	/**
	 * How much padding to include around the bounds of exports? Defaults to 32px.
	 */
	padding?: number

	/**
	 * Should the export be rendered in dark mode (true) or light mode (false)? Defaults to the
	 * current instance's dark mode setting.
	 */
	darkMode?: boolean

	/**
	 * The
	 * {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio | `preserveAspectRatio` }
	 * attribute of the SVG element.
	 */
	preserveAspectRatio?: React.SVGAttributes<SVGSVGElement>['preserveAspectRatio']
}

/** @public */
export interface TLImageExportOptions extends TLSvgExportOptions {
	/**
	 * If the export is being converted to a lossy bitmap format (e.g. jpeg), this is the quality of
	 * the export. This is a number between 0 and 1.
	 */
	quality?: number

	/**
	 * The format to export as. Defaults to 'png'.
	 */
	format?: TLExportType
}

/** @public */
export interface TLCameraMoveOptions {
	/** Whether to move the camera immediately, rather than on the next tick. */
	immediate?: boolean
	/** Whether to force the camera to move, even if the user's camera options have locked the camera. */
	force?: boolean
	/** Whether to reset the camera to its default position and zoom. */
	reset?: boolean
	/** An (optional) animation to use. */
	animation?: {
		/** The time the animation should take to arrive at the specified camera coordinates. */
		duration?: number
		/** An easing function to apply to the animation's progress from start to end. */
		easing?(t: number): number
	}
}

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

/** @public */
export interface TLUpdatePointerOptions {
	/** Whether to update the pointer immediately, rather than on the next tick. */
	immediate?: boolean
	/**
	 * The point, in screen-space, to update the pointer to. Defaults to the position of the last
	 * pointer event.
	 */
	point?: VecLike
	pointerId?: number
	ctrlKey?: boolean
	altKey?: boolean
	shiftKey?: boolean
	metaKey?: boolean
	accelKey?: boolean
	isPen?: boolean
	button?: number
}

/**
 * Options to {@link Editor.getShapeAtPoint}.
 *
 * @public
 */
export interface TLGetShapeAtPointOptions {
	/**
	 * The margin to apply to the shape.
	 * If a number, it will be applied to both the inside and outside of the shape.
	 * If an array, the first element will be applied to the inside of the shape, and the second element will be applied to the outside.
	 *
	 * @example
	 * ```ts
	 * // Get the shape at the center of the screen
	 * const shape = editor.getShapeAtProps({
	 *   margin: 10,
	 * })
	 *
	 * // Get the shape at the center of the screen with a 10px inner margin and a 5px outer margin
	 * const shape = editor.getShapeAtProps({
	 *   margin: [10, 5],
	 * })
	 * ```
	 */
	margin?: number | [number, number]
	/**
	 * Whether to register hits inside of shapes (beyond the margin), such as the inside of a solid shape.
	 */
	hitInside?: boolean
	/**
	 * Whether to register hits on locked shapes.
	 */
	hitLocked?: boolean
	/**
	 * Whether to register hits on labels.
	 */
	hitLabels?: boolean
	/**
	 * Whether to only return hits on shapes that are currently being rendered.
	 * todo: rename this to hitCulled or hitNotRendering
	 */
	renderingOnly?: boolean
	/**
	 * Whether to register hits on the inside of frame shapes.
	 * todo: rename this to hitInsideFrames
	 */
	hitFrameInside?: boolean
	/**
	 * A filter function to apply to the shapes.
	 */
	filter?(shape: TLShape): boolean
}
