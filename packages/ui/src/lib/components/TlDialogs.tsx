import { atom, Atom } from '@tldraw/state'
import { useValue } from '@tldraw/state-react'
import { uniqueId } from '@tldraw/utils'
import {
	ComponentType,
	createContext,
	memo,
	ReactNode,
	useCallback,
	useContext,
	useMemo,
	useRef,
} from 'react'
import { TlDialogRoot } from './TlDialog'

/** @public */
export interface TlDialogProps {
	onClose(): void
}

/** @public */
export interface TlDialog {
	id: string
	component: ComponentType<TlDialogProps>
	onClose?(): void
	preventBackgroundClose?: boolean
}

/** @public */
export type TlDialogEvent = 'open' | 'close'

/** @public */
export interface TlDialogsContextValue {
	addDialog(dialog: Omit<TlDialog, 'id'> & { id?: string }): string
	removeDialog(id: string): void
	clearDialogs(): void
	dialogs: Atom<TlDialog[]>
}

const TlDialogsContext = createContext<TlDialogsContextValue | null>(null)

/** @public */
export interface TlDialogsProviderProps {
	children: ReactNode
	onEvent?(event: TlDialogEvent, data: { id: string }): void
}

/** @public @react */
export function TlDialogsProvider({ children, onEvent }: TlDialogsProviderProps) {
	const parentCtx = useContext(TlDialogsContext)
	const dialogsRef = useRef(atom<TlDialog[]>('tl-dialogs', []))

	const content = useMemo((): TlDialogsContextValue => {
		const dialogs = dialogsRef.current

		return {
			dialogs,
			addDialog(dialog: Omit<TlDialog, 'id'> & { id?: string }) {
				const id = dialog.id ?? uniqueId()
				dialogs.update((d) => [...d.filter((m) => m.id !== id), { ...dialog, id }])
				onEvent?.('open', { id })
				return id
			},
			removeDialog(id: string) {
				const dialog = dialogs.get().find((d) => d.id === id)
				if (dialog) {
					dialog.onClose?.()
					onEvent?.('close', { id })
					dialogs.update((d) => d.filter((m) => m !== dialog))
				}
			},
			clearDialogs() {
				const current = dialogs.get()
				if (current.length === 0) return
				current.forEach((d) => {
					d.onClose?.()
					onEvent?.('close', { id: d.id })
				})
				dialogs.set([])
			},
		}
	}, [onEvent])

	if (parentCtx) return <>{children}</>

	return (
		<TlDialogsContext.Provider value={content}>
			{children}
			<TlDialogsRenderer />
		</TlDialogsContext.Provider>
	)
}

/** @public */
export function useTlDialogs(): TlDialogsContextValue {
	const ctx = useContext(TlDialogsContext)

	if (!ctx) {
		throw new Error('useTlDialogs must be used within a TlDialogsProvider')
	}

	return ctx
}

const TlManagedDialog = memo(function TlManagedDialog({
	id,
	component: ModalContent,
	preventBackgroundClose,
}: TlDialog) {
	const { removeDialog } = useTlDialogs()

	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			if (!isOpen) {
				removeDialog(id)
			}
		},
		[id, removeDialog]
	)

	return (
		<TlDialogRoot
			defaultOpen
			onOpenChange={handleOpenChange}
			preventBackgroundClose={preventBackgroundClose}
		>
			<ModalContent onClose={() => handleOpenChange(false)} />
		</TlDialogRoot>
	)
})

const TlDialogsRenderer = memo(function TlDialogsRenderer() {
	const { dialogs } = useTlDialogs()
	const dialogsArray = useValue('tl-dialogs', () => dialogs.get(), [dialogs])

	return (
		<>
			{dialogsArray.map((dialog) => (
				<TlManagedDialog key={dialog.id} {...dialog} />
			))}
		</>
	)
})
