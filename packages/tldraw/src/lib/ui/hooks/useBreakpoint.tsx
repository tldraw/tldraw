import { useEditor, useValue } from '@tldraw/editor'
import React, { useContext } from 'react'
import { PORTRAIT_BREAKPOINTS } from '../constants'

const BreakpointContext = React.createContext(0)

/** @public */
export function BreakPointProvider({ children }: { children: any }) {
	const editor = useEditor()

	const breakpoint = useValue(
		'breakpoint',
		() => {
			const { width } = editor.viewportScreenBounds
			const breakpoints = PORTRAIT_BREAKPOINTS

			for (let i = 0; i < breakpoints.length - 1; i++) {
				if (width > breakpoints[i] && width <= breakpoints[i + 1]) {
					return i
				}
			}

			return breakpoints.length
		},
		[editor]
	)

	return <BreakpointContext.Provider value={breakpoint}>{children}</BreakpointContext.Provider>
}

/** @public */
export function useBreakpoint() {
	let breakpoint = useContext(BreakpointContext)
	const layoutQuery = new URL(window.location.href).searchParams.get('layout')

	if (layoutQuery === 'desktop') {
		breakpoint = 7
	} else if (layoutQuery === 'mobile') {
		breakpoint = 1
	}

	return breakpoint
}
