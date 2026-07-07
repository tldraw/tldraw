import { createContext, ReactNode, useContext } from 'react'

const TlPortalContext = createContext<HTMLElement | undefined>(undefined)

/** @public */
export interface TlPortalProviderProps {
	container: HTMLElement | null
	children: ReactNode
}

/** @public @react */
export function TlPortalProvider({ container, children }: TlPortalProviderProps) {
	return (
		<TlPortalContext.Provider value={container ?? undefined}>{children}</TlPortalContext.Provider>
	)
}

/** @public */
export function useTlPortalContainer(): HTMLElement | undefined {
	return useContext(TlPortalContext)
}
