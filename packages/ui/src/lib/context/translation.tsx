import { createContext, ReactNode, useContext } from 'react'

/** @public */
export interface TldrawUiTranslationContextValue {
	dir: 'ltr' | 'rtl'
	msg(key: string, fallback: string): string
}

const defaultValue: TldrawUiTranslationContextValue = {
	dir: 'ltr',
	msg: (_key, fallback) => fallback,
}

const TldrawUiTranslationContext = createContext<TldrawUiTranslationContextValue>(defaultValue)

/** @public */
export interface TldrawUiTranslationProviderProps {
	dir?: 'ltr' | 'rtl'
	msg?(key: string): string | undefined
	children: ReactNode
}

/** @public @react */
export function TldrawUiTranslationProvider({
	dir = 'ltr',
	msg,
	children,
}: TldrawUiTranslationProviderProps) {
	const value: TldrawUiTranslationContextValue = {
		dir,
		msg: (key, fallback) => msg?.(key) ?? fallback,
	}

	return (
		<TldrawUiTranslationContext.Provider value={value}>
			{children}
		</TldrawUiTranslationContext.Provider>
	)
}

/** @public */
export function useTldrawUiTranslation(): TldrawUiTranslationContextValue {
	return useContext(TldrawUiTranslationContext)
}
