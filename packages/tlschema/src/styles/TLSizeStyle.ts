import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/**
 * Default size style property used by tldraw shapes for scaling visual elements.
 * Controls the relative size of shape elements like stroke width, text size, and other proportional features.
 *
 * Available values:
 * - `s` - Small size
 * - `m` - Medium size (default)
 * - `l` - Large size
 * - `xl` - Extra large size
 *
 * @example
 * ```ts
 * import { DefaultSizeStyle } from '@tldraw/tlschema'
 *
 * // Use in shape props definition
 * interface MyShapeProps {
 *   size: typeof DefaultSizeStyle
 *   // other props...
 * }
 *
 * // Create a shape with large size
 * const shape = {
 *   // ... other properties
 *   props: {
 *     size: 'l' as const,
 *     // ... other props
 *   }
 * }
 * ```
 *
 * @public
 */
export const DefaultSizeStyle = StyleProp.defineEnum('tldraw:size', {
	defaultValue: 'm',
	values: ['s', 'm', 'l', 'xl'],
})

/**
 * Type representing a default size style value.
 * This is a union type of all available size options.
 *
 * @example
 * ```ts
 * import { TLDefaultSizeStyle } from '@tldraw/tlschema'
 *
 * // Valid size values
 * const smallSize: TLDefaultSizeStyle = 's'
 * const mediumSize: TLDefaultSizeStyle = 'm'
 * const largeSize: TLDefaultSizeStyle = 'l'
 * const extraLargeSize: TLDefaultSizeStyle = 'xl'
 *
 * // Use in a function parameter
 * function setShapeSize(size: TLDefaultSizeStyle) {
 *   // Apply size style to shape
 * }
 * ```
 *
 * @public
 */
export type TLDefaultSizeStyle = T.TypeOf<typeof DefaultSizeStyle>
