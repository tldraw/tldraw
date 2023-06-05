import type { RecordId, UnknownRecord } from '@tldraw/store'
import { TypeValidator, string } from '@tldraw/validate'

/** @internal */
export function idValidator<Id extends RecordId<UnknownRecord>>(
	prefix: Id['__type__']['typeName']
): TypeValidator<Id> {
	return string.refine((id) => {
		if (!id.startsWith(`${prefix}:`)) {
			throw new Error(`${prefix} ID must start with "${prefix}:"`)
		}
		return id as Id
	})
}
