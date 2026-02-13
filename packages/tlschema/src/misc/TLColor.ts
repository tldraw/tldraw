import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'

/**
 * The colors used by tldraw's canvas UI system.
 *
 * These are special color types used for canvas UI elements like selections,
 * accents, and other interface components that overlay the drawing canvas.
 * Unlike shape colors, these are semantic color types that adapt to the
 * current theme.
 *
 * @example
 * ```ts
 * // Check if a color is a canvas UI color
 * if (TL_CANVAS_UI_COLOR_TYPES.has('selection-stroke')) {
 *   console.log('This is a valid canvas UI color')
 * }
 * ```
 *
 * @public
 */
export const TL_CANVAS_UI_COLOR_TYPES = new Set([
	'accent',
	'white',
	'black',
	'selection-stroke',
	'selection-fill',
	'laser',
	'muted-1',
] as const)

/**
 * A union type representing the available canvas UI color types.
 *
 * Canvas UI colors are semantic color types used for interface elements
 * that overlay the drawing canvas, such as selection indicators, accents,
 * and other UI components.
 *
 * @example
 * ```ts
 * const selectionColor: TLCanvasUiColor = 'selection-stroke'
 * const accentColor: TLCanvasUiColor = 'accent'
 * const backgroundColor: TLCanvasUiColor = 'white'
 * ```
 *
 * @public
 */
export type TLCanvasUiColor = SetValue<typeof TL_CANVAS_UI_COLOR_TYPES>

/**
 * A validator for canvas UI color types.
 *
 * This validator ensures that color values are one of the valid canvas UI
 * color types defined in {@link TL_CANVAS_UI_COLOR_TYPES}. It provides
 * runtime type checking for canvas UI color properties.
 *
 * @example
 * ```ts
 * import { canvasUiColorTypeValidator } from '@tldraw/tlschema'
 *
 * // Validate a color value
 * try {
 *   const validColor = canvasUiColorTypeValidator.validate('accent')
 *   console.log('Valid color:', validColor)
 * } catch (error) {
 *   console.error('Invalid color:', error.message)
 * }
 * ```
 *
 * @public
 */
export const canvasUiColorTypeValidator = T.setEnum(TL_CANVAS_UI_COLOR_TYPES)
