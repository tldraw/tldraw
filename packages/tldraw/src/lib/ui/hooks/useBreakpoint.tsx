import { useEditor, useValue } from '@tldraw/editor'
import React, { useContext } from 'react'
import { PORTRAIT_BREAKPOINTS } from '../constants'

const BreakpointContext = React.createContext(0)

/** @public */
export function BreakPointProvider({
	minBreakpoint = 0,
	maxBreakpoint = PORTRAIT_BREAKPOINTS.length,
	children,
}: {
	minBreakpoint?: number
	maxBreakpoint?: number
	children: any
}) {
	const editor = useEditor()

	const breakpoint = useValue(
		'breakpoint',
		() => {
			// This will recompute the viewport screen bounds changes...
			const { width } = editor.viewportScreenBounds

			if (minBreakpoint < 0 || minBreakpoint > PORTRAIT_BREAKPOINTS.length) {
				throw Error(
					`Invalid minBreakpoint value, must be between 0 and ${PORTRAIT_BREAKPOINTS.length}`
				)
			}

			if (maxBreakpoint < 0 || minBreakpoint > PORTRAIT_BREAKPOINTS.length) {
				throw Error(
					`Invalid maxBreakpoint value, must be between 0 and ${PORTRAIT_BREAKPOINTS.length}`
				)
			}

			if (maxBreakpoint < minBreakpoint) {
				throw Error(
					`Invalid maxBreakpoint value, must be greater than minBreakpoint (min: ${minBreakpoint}, max: ${maxBreakpoint})`
				)
			}

			for (let i = minBreakpoint; i < maxBreakpoint - 1; i++) {
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
	return useContext(BreakpointContext)
}
