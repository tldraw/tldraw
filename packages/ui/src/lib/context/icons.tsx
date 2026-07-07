import { createContext, ReactNode, useContext, useMemo } from 'react'

const TlIconContext = createContext<Record<string, string>>({})

/** @public */
export interface TlIconProviderProps {
	assetUrls: Record<string, string>
	children: ReactNode
}

/** @public @react */
export function TlIconProvider({ assetUrls, children }: TlIconProviderProps) {
	const parent = useContext(TlIconContext)
	const merged = useMemo(() => ({ ...parent, ...assetUrls }), [parent, assetUrls])

	return <TlIconContext.Provider value={merged}>{children}</TlIconContext.Provider>
}

/** @public */
export function useTlIconUrl(icon: string): string | undefined {
	const assetUrls = useContext(TlIconContext)
	return assetUrls[icon]
}
