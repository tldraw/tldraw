import { useEditor, useValue } from '@tldraw/editor'
import React, { useContext } from 'react'
import { PORTRAIT_BREAKPOINTS } from '../constants'

const BreakpointContext = React.createContext(0)

/** @public */
export function BreakPointProvider({
	forceMobile = false,
	children,
}: {
	forceMobile?: boolean
	children: any
}) {
	const editor = useEditor()

	const breakpoint = useValue(
		'breakpoint',
		() => {
			// This will recompute the viewport screen bounds changes...
			const { width } = editor.getViewportScreenBounds()

			const maxBreakpoint = forceMobile ? 3 : PORTRAIT_BREAKPOINTS.length - 1

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
	return useContext(BreakpointContext)
}
