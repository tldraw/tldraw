import { ToastProvider } from '@radix-ui/react-toast'
import { Editor, uniqueId } from '@tldraw/editor'
import { ReactNode, createContext, useCallback, useContext, useState } from 'react'
import { TLUiIconType } from '../icon-types'

/** @public */
export type AlertSeverity = 'success' | 'info' | 'warning' | 'error'

/** @public */
export interface TLUiToast {
	id: string
	icon?: TLUiIconType
	severity?: AlertSeverity
	title?: string
	description?: string
	actions?: TLUiToastAction[]
	keepOpen?: boolean
	closeLabel?: string
}

/** @public */
export interface TLUiToastAction {
	type: 'primary' | 'danger' | 'normal'
	label: string
	onClick: () => void
}

/** @public */
export interface TLUiToastsContextType {
	addToast: (toast: Omit<TLUiToast, 'id'> & { id?: string }) => string
	removeToast: (id: TLUiToast['id']) => string
	clearToasts: () => void
	toasts: TLUiToast[]
}

/** @internal */
export const ToastsContext = createContext<TLUiToastsContextType | null>(null)

/** @internal */
export interface ToastsProviderProps {
	overrides?: (editor: Editor) => TLUiToastsContextType
	children: ReactNode
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
		<ToastProvider>
			<ToastsContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
				{children}
			</ToastsContext.Provider>
		</ToastProvider>
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
