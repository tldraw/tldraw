import { useId } from 'react'

/**
 * React's useId hook returns a unique id for the component. However, it uses a colon in the id,
 * which is not valid for CSS selectors. This hook replaces the colon with an underscore.
 *
 * @internal
 */
export function useSafeId() {
	return sanitizeId(useId())
}

/** @internal */
export function sanitizeId(id: string) {
	return id.replace(/:/g, '_')
}
