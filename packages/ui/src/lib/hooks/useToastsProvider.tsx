import { Editor, uniqueId } from '@tldraw/editor'
import { createContext, useCallback, useContext, useState } from 'react'

/** @public */
export interface TLToast {
	id: string
	icon?: string
	title?: string
	description?: string
	actions?: TLToastAction[]
	keepOpen?: boolean
	closeLabel?: string
}

/** @public */
export interface TLToastAction {
	type: 'primary' | 'secondary' | 'warn'
	label: string
	onClick: () => void
}

/** @public */
export type ToastsContextType = {
	addToast: (toast: Omit<TLToast, 'id'> & { id?: string }) => string
	removeToast: (id: TLToast['id']) => string
	clearToasts: () => void
	toasts: TLToast[]
}

/** @public */
export const ToastsContext = createContext({} as ToastsContextType)

/** @public */
export type ToastsProviderProps = {
	overrides?: (app: Editor) => ToastsContextType
	children: any
}

/** @public */
export function ToastsProvider({ children }: ToastsProviderProps) {
	const [toasts, setToasts] = useState<TLToast[]>([])

	const addToast = useCallback((toast: Omit<TLToast, 'id'> & { id?: string }) => {
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
