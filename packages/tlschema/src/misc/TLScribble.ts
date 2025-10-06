import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLCanvasUiColor, canvasUiColorTypeValidator } from './TLColor'
import { VecModel, vecModelValidator } from './geometry-types'

/**
 * All available scribble states used by the tldraw drawing system.
 *
 * Scribble states represent the different phases of a drawing stroke:
 *
 * - `starting`: The scribble is being initiated
 * - `paused`: The scribble is temporarily paused
 * - `active`: The scribble is actively being drawn
 * - `stopping`: The scribble is being finished
 *
 * These states help manage the drawing lifecycle and apply appropriate
 * visual effects during different phases of the stroke.
 *
 * @example
 * ```ts
 * // Check if a scribble state is valid
 * if (TL_SCRIBBLE_STATES.has('active')) {
 *   console.log('Valid scribble state')
 * }
 *
 * // Get all available scribble states
 * const allStates = Array.from(TL_SCRIBBLE_STATES)
 * ```
 *
 * @public
 */
export const TL_SCRIBBLE_STATES = new Set(['starting', 'paused', 'active', 'stopping'] as const)

/**
 * A scribble object representing a drawing stroke in tldraw.
 *
 * Scribbles are temporary drawing strokes that appear during freehand drawing
 * operations. They provide visual feedback as the user draws and can be styled
 * with various properties like size, color, and effects.
 *
 * @example
 * ```ts
 * // A basic scribble stroke
 * const scribble: TLScribble = {
 *   id: 'scribble-123',
 *   points: [
 *     { x: 0, y: 0, z: 0.5 },
 *     { x: 10, y: 5, z: 0.7 },
 *     { x: 20, y: 10, z: 0.6 }
 *   ],
 *   size: 4,
 *   color: 'black',
 *   opacity: 0.8,
 *   state: 'active',
 *   delay: 0,
 *   shrink: 0.1,
 *   taper: true
 * }
 *
 * // A laser pointer scribble
 * const laserScribble: TLScribble = {
 *   id: 'laser-pointer',
 *   points: [{ x: 50, y: 50, z: 1.0 }],
 *   size: 8,
 *   color: 'laser',
 *   opacity: 1.0,
 *   state: 'active',
 *   delay: 100,
 *   shrink: 0,
 *   taper: false
 * }
 * ```
 *
 * @public
 */
export interface TLScribble {
	/** Unique identifier for the scribble */
	id: string
	/** Array of points that make up the scribble path */
	points: VecModel[]
	/** The brush size/width of the scribble stroke */
	size: number
	/** The color of the scribble using canvas UI color types */
	color: TLCanvasUiColor
	/** The opacity of the scribble (0-1) */
	opacity: number
	/** The current state of the scribble drawing */
	state: SetValue<typeof TL_SCRIBBLE_STATES>
	/** Time delay in milliseconds for animation effects */
	delay: number
	/** Amount the stroke should shrink over time (0-1) */
	shrink: number
	/** Whether the stroke should taper at the ends */
	taper: boolean
}

/**
 * A validator for TLScribble objects.
 *
 * This validator ensures that scribble objects have all required properties
 * with valid types and values. It validates the points array, size constraints,
 * color types, and state values according to the scribble system requirements.
 *
 * @example
 * ```ts
 * import { scribbleValidator } from '@tldraw/tlschema'
 *
 * // Validate a scribble object
 * try {
 *   const validScribble = scribbleValidator.validate({
 *     id: 'scribble-1',
 *     points: [{ x: 0, y: 0, z: 1 }, { x: 10, y: 10, z: 1 }],
 *     size: 3,
 *     color: 'black',
 *     opacity: 0.8,
 *     state: 'active',
 *     delay: 0,
 *     shrink: 0.05,
 *     taper: true
 *   })
 *   console.log('Valid scribble:', validScribble)
 * } catch (error) {
 *   console.error('Invalid scribble:', error.message)
 * }
 * ```
 *
 * @public
 */
export const scribbleValidator: T.ObjectValidator<TLScribble> = T.object({
	id: T.string,
	points: T.arrayOf(vecModelValidator),
	size: T.positiveNumber,
	color: canvasUiColorTypeValidator,
	opacity: T.number,
	state: T.setEnum(TL_SCRIBBLE_STATES),
	delay: T.number,
	shrink: T.number,
	taper: T.boolean,
})
