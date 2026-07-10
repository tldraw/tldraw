import { createContext, ReactNode, useContext } from 'react'

const TldrawUiPortalContext = createContext<HTMLElement | undefined>(undefined)

/** @public */
export interface TldrawUiPortalProviderProps {
	container: HTMLElement | null
	children: ReactNode
}

/** @public @react */
export function TldrawUiPortalProvider({ container, children }: TldrawUiPortalProviderProps) {
	return (
		<TldrawUiPortalContext.Provider value={container ?? undefined}>
			{children}
		</TldrawUiPortalContext.Provider>
	)
}

/** @public */
export function useTldrawUiPortalContainer(): HTMLElement | undefined {
	return useContext(TldrawUiPortalContext)
}

/** @public */
export function useTldrawUiContainer(): HTMLElement | undefined {
	return useTldrawUiPortalContainer()
}

export function TldrawUiPortalScope({ children }: { children: ReactNode }) {
	return <div className="tl-ui">{children}</div>
}
