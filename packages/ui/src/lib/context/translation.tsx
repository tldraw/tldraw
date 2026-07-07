import { createContext, ReactNode, useContext } from 'react'

/** @public */
export interface TlTranslationContextValue {
	dir: 'ltr' | 'rtl'
	msg(key: string, fallback: string): string
}

const defaultValue: TlTranslationContextValue = {
	dir: 'ltr',
	msg: (_key, fallback) => fallback,
}

const TlTranslationContext = createContext<TlTranslationContextValue>(defaultValue)

/** @public */
export interface TlTranslationProviderProps {
	dir?: 'ltr' | 'rtl'
	msg?(key: string): string | undefined
	children: ReactNode
}

/** @public @react */
export function TlTranslationProvider({ dir = 'ltr', msg, children }: TlTranslationProviderProps) {
	const value: TlTranslationContextValue = {
		dir,
		msg: (key, fallback) => msg?.(key) ?? fallback,
	}

	return <TlTranslationContext.Provider value={value}>{children}</TlTranslationContext.Provider>
}

/** @public */
export function useTlTranslation(): TlTranslationContextValue {
	return useContext(TlTranslationContext)
}
