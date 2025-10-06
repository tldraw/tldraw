import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/**
 * Default text alignment style property used by tldraw text shapes.
 * Controls how text content is aligned within text-based shapes like text boxes and notes.
 *
 * Available values:
 * - `start` - Align text to the start (left in LTR, right in RTL)
 * - `middle` - Center text horizontally
 * - `end` - Align text to the end (right in LTR, left in RTL)
 *
 * @example
 * ```ts
 * import { DefaultTextAlignStyle } from '@tldraw/tlschema'
 *
 * // Use in text shape props definition
 * interface MyTextShapeProps {
 *   textAlign: typeof DefaultTextAlignStyle
 *   // other props...
 * }
 *
 * // Create a text shape with center alignment
 * const textShape = {
 *   // ... other properties
 *   props: {
 *     textAlign: 'middle' as const,
 *     // ... other props
 *   }
 * }
 * ```
 *
 * @public
 */
export const DefaultTextAlignStyle = StyleProp.defineEnum('tldraw:textAlign', {
	defaultValue: 'start',
	values: ['start', 'middle', 'end'],
})

/**
 * Type representing a default text alignment style value.
 * This is a union type of all available text alignment options.
 *
 * @example
 * ```ts
 * import { TLDefaultTextAlignStyle } from '@tldraw/tlschema'
 *
 * // Valid text alignment values
 * const leftAlign: TLDefaultTextAlignStyle = 'start'
 * const centerAlign: TLDefaultTextAlignStyle = 'middle'
 * const rightAlign: TLDefaultTextAlignStyle = 'end'
 *
 * // Use in a function parameter
 * function setTextAlignment(align: TLDefaultTextAlignStyle) {
 *   // Apply text alignment to text shape
 * }
 * ```
 *
 * @public
 */
export type TLDefaultTextAlignStyle = T.TypeOf<typeof DefaultTextAlignStyle>
