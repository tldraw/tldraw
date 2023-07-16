import { nanoid } from 'nanoid'

/**
 * Generate a unique id.
 *
 * @example
 *
 * ```ts
 * const id = uniqueId()
 * ```
 *
 * @public
 */
export function uniqueId() {
	return nanoid()
}
