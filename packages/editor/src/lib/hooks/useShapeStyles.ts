import { TLShape } from '@tldraw/tlschema'
import { TLResolvedStyles } from '../editor/TLShapeStyles'
import { useEditor } from './useEditor'

/**
 * Get the resolved styles for a shape. Returns the fully resolved style values
 * after applying global tokens, per-shape options, and runtime overrides.
 *
 * @param shape - The shape to get styles for.
 * @returns The resolved styles for the shape.
 *
 * @public
 */
export function useShapeStyles<T extends TLShape>(shape: T): TLResolvedStyles<T> {
	const editor = useEditor()
	return editor.getShapeStyles(shape) as TLResolvedStyles<T>
}
