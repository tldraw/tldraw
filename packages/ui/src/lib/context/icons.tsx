import { createContext, ReactNode, useContext, useMemo } from 'react'

const TldrawUiIconContext = createContext<Record<string, string>>({})

/** @public */
export interface TldrawUiIconProviderProps {
	assetUrls: Record<string, string>
	children: ReactNode
}

/** @public @react */
export function TldrawUiIconProvider({ assetUrls, children }: TldrawUiIconProviderProps) {
	const parent = useContext(TldrawUiIconContext)
	const merged = useMemo(() => ({ ...parent, ...assetUrls }), [parent, assetUrls])

	return <TldrawUiIconContext.Provider value={merged}>{children}</TldrawUiIconContext.Provider>
}

/** @public */
export function useTldrawUiIconUrl(icon: string): string | undefined {
	const assetUrls = useContext(TldrawUiIconContext)
	return assetUrls[icon]
}
