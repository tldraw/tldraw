import { createContext, ReactNode, useContext } from 'react'

// Breakpoints for portrait, keep in sync with TL_PORTRAIT_BREAKPOINT enum below!
/** @internal */
export const PORTRAIT_BREAKPOINTS = [0, 389, 436, 476, 580, 640, 840, 1023]

/** @public */
export const TL_PORTRAIT_BREAKPOINT = {
	ZERO: 0,
	MOBILE_XXS: 1,
	MOBILE_XS: 2,
	MOBILE_SM: 3,
	MOBILE: 4,
	TABLET_SM: 5,
	TABLET: 6,
	DESKTOP: 7,
} as const

const TlBreakpointContext = createContext<number>(TL_PORTRAIT_BREAKPOINT.DESKTOP)

/** @public */
export interface TlBreakpointProviderProps {
	breakpoint: number
	children: ReactNode
}

/** @public @react */
export function TlBreakpointProvider({ breakpoint, children }: TlBreakpointProviderProps) {
	return <TlBreakpointContext.Provider value={breakpoint}>{children}</TlBreakpointContext.Provider>
}

/** @public */
export function useTlBreakpoint(): number {
	return useContext(TlBreakpointContext)
}
