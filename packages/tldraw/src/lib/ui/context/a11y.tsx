import { Atom, useAtom } from '@tldraw/editor'
import { createContext, useContext, useMemo } from 'react'

/** @public */
export type A11yPriority = 'polite' | 'assertive'

/** @public */
export interface TLUiA11y {
	msg: string | undefined
	priority?: A11yPriority
}

/** @public */
export interface TLUiA11yContextType {
	announce(msg: TLUiA11y): void
	currentMsg: Atom<TLUiA11y>
}

/** @internal */
export const A11yContext = createContext<TLUiA11yContextType | null>(null)

/** @public */
export interface A11yProviderProps {
	children: React.ReactNode
}

/** @public @react */
export function TldrawUiA11yProvider({ children }: A11yProviderProps) {
	const currentMsg = useAtom<TLUiA11y>('a11y', { msg: '', priority: 'assertive' })
	const ctx = useContext(A11yContext)

	const current = useMemo(
		() => ({
			currentMsg,
			announce(msg: TLUiA11y) {
				if (!msg) return
				currentMsg.set(msg)
			},
		}),
		[currentMsg]
	)

	// if the user has already provided a context higher up, reuse that one
	if (ctx) {
		return <>{children}</>
	}

	return <A11yContext.Provider value={current}>{children}</A11yContext.Provider>
}

/** @public */
export function useA11y() {
	const ctx = useContext(A11yContext)

	if (!ctx) {
		throw new Error('useA11y must be used within a A11yContext.Provider')
	}

	return ctx
}
