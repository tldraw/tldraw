import { Editor, uniqueId } from '@tldraw/editor'
import { createContext, useCallback, useContext, useState } from 'react'

/** @public */
export interface TLUiToast {
	id: string
	icon?: string
	title?: string
	description?: string
	actions?: TLUiToastAction[]
	keepOpen?: boolean
	closeLabel?: string
}

/** @public */
export interface TLUiToastAction {
	type: 'primary' | 'secondary' | 'warn'
	label: string
	onClick: () => void
}

/** @public */
export type TLUiToastsContextType = {
	addToast: (toast: Omit<TLUiToast, 'id'> & { id?: string }) => string
	removeToast: (id: TLUiToast['id']) => string
	clearToasts: () => void
	toasts: TLUiToast[]
}

/** @internal */
export const ToastsContext = createContext({} as TLUiToastsContextType)

/** @internal */
export type ToastsProviderProps = {
	overrides?: (editor: Editor) => TLUiToastsContextType
	children: any
}

/** @internal */
export function ToastsProvider({ children }: ToastsProviderProps) {
	const [toasts, setToasts] = useState<TLUiToast[]>([])

	const addToast = useCallback((toast: Omit<TLUiToast, 'id'> & { id?: string }) => {
		const id = toast.id ?? uniqueId()
		setToasts((d) => [...d.filter((m) => m.id !== toast.id), { ...toast, id }])
		return id
	}, [])

	const removeToast = useCallback((id: string) => {
		setToasts((d) => d.filter((m) => m.id !== id))
		return id
	}, [])

	const clearToasts = useCallback(() => {
		setToasts(() => [])
	}, [])

	return (
		<ToastsContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
			{children}
		</ToastsContext.Provider>
	)
}

/** @public */
export function useToasts() {
	const ctx = useContext(ToastsContext)

	if (!ctx) {
		throw new Error('useToasts must be used within a ToastsProvider')
	}

	return ctx
}
