/**
 * A client-minted id for one page load, so a browser's `first_load` analytics event can be joined
 * to this worker's Analytics Engine timers. Unvalidated client input that lands in analytics blobs,
 * so only the exact shape the client mints is accepted; anything else is treated as absent.
 */
export const LOAD_ID_PARAM = 'loadId'
export const LOAD_ID_HEADER = 'x-tldraw-load-id'

export function parseLoadId(value: string | null | undefined): string | undefined {
	if (!value) return undefined
	return /^[A-Za-z0-9_-]{8,32}$/.test(value) ? value : undefined
}
