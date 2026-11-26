import { PORTRAIT_BREAKPOINT, useBreakpoint } from 'tldraw'

/**
 * Whether the panel lays out for a phone: the breakpoint below which tldraw's toolbar and style
 * panel switch to their mobile layout, and which `forceMobile` on `<Tldraw>` forces. Without
 * tldraw's UI around it (`hideUi`, a UI of the host's own) the breakpoint provider is absent and
 * `useBreakpoint` throws, so it's false there.
 */
export function useIsPhone(): boolean {
	let breakpoint: number
	try {
		// The call is unconditional; the try only guards the provider's absence, not hook order.
		// oxlint-disable-next-line react-hooks/rules-of-hooks
		breakpoint = useBreakpoint()
	} catch {
		return false
	}
	return breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM
}
