import { atom, Atom } from '@tldraw/state'
import { useValue } from '@tldraw/state-react'
import { uniqueId } from '@tldraw/utils'
import { createContext, memo, useCallback, useContext, useMemo, useRef } from 'react'
import {
	TldrawUiToast,
	TldrawUiToastAction,
	TldrawUiToastProvider,
	TldrawUiToastProviderProps,
	TldrawUiToastSeverity,
	TldrawUiToastViewport,
} from './TldrawUiToast'

/** @public */
export interface TldrawUiToastData {
	id?: string
	severity?: TldrawUiToastSeverity
	title?: string
	description?: string
	icon?: string
	iconLabel?: string
	actions?: TldrawUiToastAction[]
	keepOpen?: boolean
}

interface TldrawUiManagedToastData extends TldrawUiToastData {
	id: string
}

/** @public */
export interface TldrawUiToastsContextValue {
	addToast(toast: TldrawUiToastData): string
	removeToast(id: string): void
	clearToasts(): void
	toasts: Atom<TldrawUiToastData[]>
}

const TldrawUiToastsContext = createContext<TldrawUiToastsContextValue | null>(null)

/** @public */
export type TldrawUiToastsProviderProps = TldrawUiToastProviderProps

/** @public @react */
export function TldrawUiToastsProvider({
	children,
	...toastProviderProps
}: TldrawUiToastsProviderProps) {
	const parentCtx = useContext(TldrawUiToastsContext)
	const toastsRef = useRef(atom<TldrawUiToastData[]>('tl-toasts', []))

	const content = useMemo((): TldrawUiToastsContextValue => {
		const toasts = toastsRef.current

		return {
			toasts,
			addToast(toast: TldrawUiToastData) {
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
		<TldrawUiToastProvider {...toastProviderProps}>
			<TldrawUiToastsContext.Provider value={content}>
				{children}
				<TldrawUiToastsRenderer />
			</TldrawUiToastsContext.Provider>
		</TldrawUiToastProvider>
	)
}

/** @public */
export function useTldrawUiToasts(): TldrawUiToastsContextValue {
	const ctx = useContext(TldrawUiToastsContext)

	if (!ctx) {
		throw new Error('useTldrawUiToasts must be used within a TldrawUiToastsProvider')
	}

	return ctx
}

const TldrawUiManagedToast = memo(function TldrawUiManagedToast({
	toast,
}: {
	toast: TldrawUiManagedToastData
}) {
	const { removeToast } = useTldrawUiToasts()

	const onOpenChange = useCallback(
		(isOpen: boolean) => {
			if (!isOpen) {
				removeToast(toast.id)
			}
		},
		[removeToast, toast.id]
	)

	return (
		<TldrawUiToast
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

const TldrawUiToastsRenderer = memo(function TldrawUiToastsRenderer() {
	const { toasts } = useTldrawUiToasts()
	const toastsArray = useValue('tl-toasts', () => toasts.get(), [toasts])

	return (
		<>
			{toastsArray.map((toast) => (
				<TldrawUiManagedToast key={toast.id ?? ''} toast={toast as TldrawUiManagedToastData} />
			))}
			<TldrawUiToastViewport />
		</>
	)
})
