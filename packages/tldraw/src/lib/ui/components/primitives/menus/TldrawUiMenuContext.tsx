import { createContext, useContext } from 'react'
import { TLUiEventSource } from '../../../context/events'

/** @public */
export type TLUiMenuContextType =
	| 'panel'
	| 'menu'
	| 'small-icons'
	| 'context-menu'
	| 'icons'
	| 'keyboard-shortcuts'
	| 'helper-buttons'
	| 'toolbar'
	| 'toolbar-overflow'

/** @public */
export interface TLUiMenuContextBase {
	type: TLUiMenuContextType
	sourceId: TLUiEventSource
}

/** @public */
export interface TLUiMenuContextWithOrientation extends TLUiMenuContextBase {
	type: 'toolbar' | 'toolbar-overflow'
	orientation: 'horizontal' | 'vertical'
}

/** @public */
export interface TLUiMenuContextWithoutOrientation extends TLUiMenuContextBase {
	type:
		| 'panel'
		| 'menu'
		| 'small-icons'
		| 'context-menu'
		| 'icons'
		| 'keyboard-shortcuts'
		| 'helper-buttons'
}

/** @public */
export type TLUiMenuContext = TLUiMenuContextWithoutOrientation | TLUiMenuContextWithOrientation

const menuContext = createContext<TLUiMenuContext | null>(null)

/** @public */
export function useTldrawUiMenuContext() {
	const context = useContext(menuContext)
	if (!context) {
		throw new Error('useTldrawUiMenuContext must be used within a TldrawUiMenuContextProvider')
	}
	return context
}

/** @public */
export interface TLUiMenuContextProviderProps {
	context: TLUiMenuContext
	children: React.ReactNode
}

/** @public @react */
export function TldrawUiMenuContextProvider({ context, children }: TLUiMenuContextProviderProps) {
	return <menuContext.Provider value={context}>{children}</menuContext.Provider>
}
