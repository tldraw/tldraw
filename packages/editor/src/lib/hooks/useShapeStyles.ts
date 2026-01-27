import { useValue } from '@tldraw/state-react'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { TLShapeResolvedStyles } from '../editor/TLShapeStyles'
import { useEditor } from './useEditor'

/**
 * Get the resolved styles for a shape, merging default styles with any overrides.
 *
 * This hook returns the computed low-level style values for a shape based on its
 * high-level props, with any overrides from `getShapeStyleOverrides` applied.
 *
 * @example
 * ```tsx
 * function MyShapeComponent({ shape }: { shape: TLGeoShape }) {
 *   const styles = useShapeStyles(shape)
 *
 *   return (
 *     <path
 *       strokeWidth={styles?.strokeWidth}
 *       stroke={styles?.strokeColor}
 *       strokeLinecap={styles?.strokeLinecap}
 *     />
 *   )
 * }
 * ```
 *
 * @param shapeOrId - The shape or shape id to get styles for.
 * @returns The resolved styles, or undefined if the shape doesn't exist or
 *          its ShapeUtil doesn't implement getDefaultStyles.
 *
 * @public
 */
export function useShapeStyles<T extends TLShapeResolvedStyles = TLShapeResolvedStyles>(
	shapeOrId: TLShape | TLShapeId
): T {
	const editor = useEditor()
	const shapeId = typeof shapeOrId === 'string' ? shapeOrId : shapeOrId.id

	return useValue(
		'shapeStyles',
		() => {
			return editor.getShapeStyles<T>(shapeId)!
		},
		[editor, shapeId]
	)
}

/**
 * Get a specific style value for a shape.
 *
 * This is a convenience hook for getting a single style value from a shape.
 *
 * @example
 * ```tsx
 * function MyShapeComponent({ shape }: { shape: TLGeoShape }) {
 *   const strokeWidth = useShapeStyleValue(shape, 'strokeWidth')
 *   const strokeColor = useShapeStyleValue(shape, 'strokeColor')
 *
 *   return (
 *     <path strokeWidth={strokeWidth} stroke={strokeColor} />
 *   )
 * }
 * ```
 *
 * @param shapeOrId - The shape or shape id to get the style value for.
 * @param styleName - The name of the style to get.
 * @returns The style value, or undefined if the style doesn't exist.
 *
 * @public
 */
export function useShapeStyleValue<K extends keyof TLShapeResolvedStyles>(
	shapeOrId: TLShape | TLShapeId,
	styleName: K
): TLShapeResolvedStyles[K] | undefined {
	const editor = useEditor()
	const shapeId = typeof shapeOrId === 'string' ? shapeOrId : shapeOrId.id

	return useValue(
		`shapeStyle:${styleName}`,
		() => {
			return editor.getShapeStyleValue(shapeId, styleName)
		},
		[editor, shapeId, styleName]
	)
}
