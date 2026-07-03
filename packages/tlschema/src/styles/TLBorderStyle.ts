import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/**
 * Default border style property used by tldraw media shapes (image and video) for
 * decorative framing. Controls whether a shape renders a border or drop shadow.
 *
 * Available values:
 * - `none` - No border, the shape is unchanged (default)
 * - `solid` - A solid stroke around the shape
 * - `shadow` - A blurred, offset drop shadow behind the shape
 * - `shadow-hard` - The same offset drop shadow with no blur
 *
 * @example
 * ```ts
 * import { DefaultBorderStyle } from '@tldraw/tlschema'
 *
 * // Use in shape props definition
 * interface MyShapeProps {
 *   border: typeof DefaultBorderStyle
 *   // other props...
 * }
 *
 * // Create a shape with a drop shadow
 * const shape = {
 *   // ... other properties
 *   props: {
 *     border: 'shadow' as const,
 *     // ... other props
 *   }
 * }
 * ```
 *
 * @public
 */
export const DefaultBorderStyle = StyleProp.defineEnum('tldraw:border', {
	defaultValue: 'none',
	values: ['none', 'solid', 'shadow', 'shadow-hard'],
})

/**
 * Type representing a default border style value.
 * This is a union type of all available border style options.
 *
 * @example
 * ```ts
 * import { TLDefaultBorderStyle } from '@tldraw/tlschema'
 *
 * // Valid border style values
 * const noBorder: TLDefaultBorderStyle = 'none'
 * const solidBorder: TLDefaultBorderStyle = 'solid'
 * const shadow: TLDefaultBorderStyle = 'shadow'
 *
 * // Use in a function parameter
 * function setShapeBorder(border: TLDefaultBorderStyle) {
 *   // Apply border style to shape
 * }
 * ```
 *
 * @public
 */
export type TLDefaultBorderStyle = T.TypeOf<typeof DefaultBorderStyle>
