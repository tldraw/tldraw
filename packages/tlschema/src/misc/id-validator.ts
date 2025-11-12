import type { RecordId, UnknownRecord } from '@tldraw/store'
import { T } from '@tldraw/validate'

/**
 * Creates a validator for typed record IDs that ensures they follow the correct
 * format with the specified prefix. Record IDs in tldraw follow the pattern
 * "prefix:identifier" where the prefix indicates the record type.
 *
 * @param prefix - The required prefix for the ID (e.g., 'shape', 'page', 'asset')
 * @returns A validator that checks the ID format and returns the typed ID
 * @public
 * @example
 * ```ts
 * const shapeIdValidator = idValidator<TLShapeId>('shape')
 * const validId = shapeIdValidator.validate('shape:abc123') // Returns 'shape:abc123' as TLShapeId
 *
 * const pageIdValidator = idValidator<TLPageId>('page')
 * const pageId = pageIdValidator.validate('page:main') // Returns 'page:main' as TLPageId
 *
 * // This would throw an error:
 * // shapeIdValidator.validate('page:abc123') // Error: shape ID must start with "shape:"
 * ```
 */
export function idValidator<Id extends RecordId<UnknownRecord>>(
	prefix: Id['__type__']['typeName']
): T.Validator<Id> {
	return T.string.refine((id) => {
		if (!id.startsWith(`${prefix}:`)) {
			throw new Error(`${prefix} ID must start with "${prefix}:"`)
		}
		return id as Id
	})
}
