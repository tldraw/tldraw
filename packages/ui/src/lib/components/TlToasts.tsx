import { atom, Atom } from '@tldraw/state'
import { useValue } from '@tldraw/state-react'
import { uniqueId } from '@tldraw/utils'
import { createContext, memo, useCallback, useContext, useMemo, useRef } from 'react'
import {
	TlToast,
	TlToastAction,
	TlToastProvider,
	TlToastProviderProps,
	TlToastSeverity,
	TlToastViewport,
} from './TlToast'

/** @public */
export interface TlToastData {
	id?: string
	severity?: TlToastSeverity
	title?: string
	description?: string
	icon?: string
	iconLabel?: string
	actions?: TlToastAction[]
	keepOpen?: boolean
}

interface TlManagedToastData extends TlToastData {
	id: string
}

/** @public */
export interface TlToastsContextValue {
	addToast(toast: TlToastData): string
	removeToast(id: string): void
	clearToasts(): void
	toasts: Atom<TlToastData[]>
}

const TlToastsContext = createContext<TlToastsContextValue | null>(null)

/** @public */
export type TlToastsProviderProps = TlToastProviderProps

/** @public @react */
export function TlToastsProvider({ children, ...toastProviderProps }: TlToastsProviderProps) {
	const parentCtx = useContext(TlToastsContext)
	const toastsRef = useRef(atom<TlToastData[]>('tl-toasts', []))

	const content = useMemo((): TlToastsContextValue => {
		const toasts = toastsRef.current

		return {
			toasts,
			addToast(toast: TlToastData) {
				const id = toast.id ?? uniqueId()
				toasts.update((d) => [...d.filter((m) => m.id !== id), { ...toast, id }])
				return id
			},
			removeToast(id: string) {
				toasts.update((d) => d.filter((m) => m.id !== id))
			},
			clearToasts() {
				toasts.set([])
			},
		}
	}, [])

	if (parentCtx) return <>{children}</>

	return (
		<TlToastProvider {...toastProviderProps}>
			<TlToastsContext.Provider value={content}>
				{children}
				<TlToastsRenderer />
			</TlToastsContext.Provider>
		</TlToastProvider>
	)
}

/** @public */
export function useTlToasts(): TlToastsContextValue {
	const ctx = useContext(TlToastsContext)

	if (!ctx) {
		throw new Error('useTlToasts must be used within a TlToastsProvider')
	}

	return ctx
}

const TlManagedToast = memo(function TlManagedToast({ toast }: { toast: TlManagedToastData }) {
	const { removeToast } = useTlToasts()

	const onOpenChange = useCallback(
		(isOpen: boolean) => {
			if (!isOpen) {
				removeToast(toast.id)
			}
		},
		[removeToast, toast.id]
	)

	return (
		<TlToast
			onOpenChange={onOpenChange}
			severity={toast.severity}
			icon={toast.icon}
			iconLabel={toast.iconLabel}
			title={toast.title}
			description={toast.description}
			actions={toast.actions}
			keepOpen={toast.keepOpen}
		/>
	)
})

const TlToastsRenderer = memo(function TlToastsRenderer() {
	const { toasts } = useTlToasts()
	const toastsArray = useValue('tl-toasts', () => toasts.get(), [toasts])

	return (
		<>
			{toastsArray.map((toast) => (
				<TlManagedToast key={toast.id ?? ''} toast={toast as TlManagedToastData} />
			))}
			<TlToastViewport />
		</>
	)
})
