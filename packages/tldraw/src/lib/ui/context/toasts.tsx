import { ToastProvider } from '@radix-ui/react-toast'
import { Atom, Editor, uniqueId, useAtom } from '@tldraw/editor'
import { ReactNode, createContext, useContext, useMemo } from 'react'
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
	onClick(): void
}

/** @public */
export interface TLUiToastsContextType {
	addToast(toast: Omit<TLUiToast, 'id'> & { id?: string }): string
	removeToast(id: TLUiToast['id']): string
	clearToasts(): void
	toasts: Atom<TLUiToast[]>
}

/** @internal */
export const ToastsContext = createContext<TLUiToastsContextType | null>(null)

/** @public */
export interface TLUiToastsProviderProps {
	overrides?(editor: Editor): TLUiToastsContextType
	children: ReactNode
}

/** @public @react */
export function TldrawUiToastsProvider({ children }: TLUiToastsProviderProps) {
	const toasts = useAtom<TLUiToast[]>('toasts', [])

	const current = useMemo(() => {
		return {
			toasts,
			addToast(toast: Omit<TLUiToast, 'id'> & { id?: string }) {
				const id = toast.id ?? uniqueId()
				toasts.update((d) => [...d.filter((m) => m.id !== toast.id), { ...toast, id }])
				return id
			},
			removeToast(id: string) {
				toasts.update((d) => d.filter((m) => m.id !== id))
				return id
			},
			clearToasts() {
				toasts.set([])
			},
		}
	}, [toasts])

	return (
		<ToastProvider>
			<ToastsContext.Provider value={current}>{children}</ToastsContext.Provider>
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
