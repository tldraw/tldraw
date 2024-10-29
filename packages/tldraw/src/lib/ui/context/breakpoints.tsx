import { useMaybeEditor, useValue } from '@tldraw/editor'
import React, { ReactNode, useContext } from 'react'
import { PORTRAIT_BREAKPOINT, PORTRAIT_BREAKPOINTS } from '../constants'

const BreakpointContext = React.createContext<number | null>(null)

/** @public */
export interface BreakPointProviderProps {
	forceMobile?: boolean
	children: ReactNode
}

/** @public @react */
export function BreakPointProvider({ forceMobile = false, children }: BreakPointProviderProps) {
	const editor = useMaybeEditor()

	const breakpoint = useValue(
		'breakpoint',
		() => {
			// This will recompute the viewport screen bounds changes...
			const { width } = editor?.getViewportScreenBounds() ?? { width: window.innerWidth }

			const maxBreakpoint = forceMobile
				? PORTRAIT_BREAKPOINT.MOBILE_SM
				: PORTRAIT_BREAKPOINTS.length - 1

			for (let i = 0; i < maxBreakpoint; i++) {
				if (width > PORTRAIT_BREAKPOINTS[i] && width <= PORTRAIT_BREAKPOINTS[i + 1]) {
					return i
				}
			}

			return maxBreakpoint
		},
		[editor]
	)

	return <BreakpointContext.Provider value={breakpoint}>{children}</BreakpointContext.Provider>
}

/** @public */
export function useBreakpoint() {
	const breakpoint = useContext(BreakpointContext)
	if (breakpoint === null) {
		throw new Error('useBreakpoint must be used inside of the <BreakpointProvider /> component')
	}
	return breakpoint
}
