import type { TLShape } from '@tldraw/tlschema'
import type { TLAttributionUser } from './permissions-types'

/**
 * Extract the creator identity from a shape's meta.
 * @public
 */
export function getShapeCreator(shape: TLShape): TLAttributionUser | null {
	const meta = shape.meta as Record<string, unknown>
	return (meta?.createdBy as TLAttributionUser | undefined) ?? null
}

/**
 * Extract the creator's user ID from a shape's meta.
 * @public
 */
export function getShapeCreatorId(shape: TLShape): string | null {
	return getShapeCreator(shape)?.id ?? null
}
