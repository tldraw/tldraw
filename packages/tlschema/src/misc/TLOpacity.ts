import { T } from '@tldraw/validate'

/**
 * A type representing opacity values in tldraw.
 *
 * Opacity values are numbers between 0 and 1, where 0 is fully transparent
 * and 1 is fully opaque. This type is used throughout the editor to control
 * the transparency of shapes, UI elements, and other visual components.
 *
 * @example
 * ```ts
 * const fullyOpaque: TLOpacityType = 1.0
 * const halfTransparent: TLOpacityType = 0.5
 * const fullyTransparent: TLOpacityType = 0.0
 * const quarterOpaque: TLOpacityType = 0.25
 * ```
 *
 * @public
 */
export type TLOpacityType = number

/**
 * A validator for opacity values.
 *
 * This validator ensures that opacity values are numbers between 0 and 1 (inclusive).
 * Values outside this range will cause a validation error. The validator provides
 * runtime type checking for opacity properties throughout the editor.
 *
 * @param n - The number to validate as an opacity value
 * @throws T.ValidationError When the value is not between 0 and 1
 *
 * @example
 * ```ts
 * import { opacityValidator } from '@tldraw/tlschema'
 *
 * // Valid opacity values
 * try {
 *   const validOpacity1 = opacityValidator.validate(0.5) // ✓
 *   const validOpacity2 = opacityValidator.validate(1.0) // ✓
 *   const validOpacity3 = opacityValidator.validate(0.0) // ✓
 * } catch (error) {
 *   console.error('Validation failed:', error.message)
 * }
 *
 * // Invalid opacity values
 * try {
 *   opacityValidator.validate(-0.1) // ✗ Throws error
 *   opacityValidator.validate(1.5)  // ✗ Throws error
 * } catch (error) {
 *   console.error('Invalid opacity:', error.message)
 * }
 * ```
 *
 * @public
 */
export const opacityValidator = T.number.check((n) => {
	if (n < 0 || n > 1) {
		throw new T.ValidationError('Opacity must be between 0 and 1')
	}
})
