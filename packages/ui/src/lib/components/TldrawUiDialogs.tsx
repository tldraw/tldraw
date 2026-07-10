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
import { TldrawUiDialogRoot } from './TldrawUiDialog'

/** @public */
export interface TldrawUiDialogProps {
	onClose(): void
}

/** @public */
export interface TldrawUiDialog {
	id: string
	component: ComponentType<TldrawUiDialogProps>
	onClose?(): void
	preventBackgroundClose?: boolean
}

/** @public */
export type TldrawUiDialogEvent = 'open' | 'close'

/** @public */
export interface TldrawUiDialogsContextValue {
	addDialog(dialog: Omit<TldrawUiDialog, 'id'> & { id?: string }): string
	removeDialog(id: string): void
	clearDialogs(): void
	dialogs: Atom<TldrawUiDialog[]>
}

const TldrawUiDialogsContext = createContext<TldrawUiDialogsContextValue | null>(null)

/** @public */
export interface TldrawUiDialogsProviderProps {
	children: ReactNode
	onEvent?(event: TldrawUiDialogEvent, data: { id: string }): void
}

/** @public @react */
export function TldrawUiDialogsProvider({ children, onEvent }: TldrawUiDialogsProviderProps) {
	const parentCtx = useContext(TldrawUiDialogsContext)
	const dialogsRef = useRef(atom<TldrawUiDialog[]>('tl-dialogs', []))

	const content = useMemo((): TldrawUiDialogsContextValue => {
		const dialogs = dialogsRef.current

		return {
			dialogs,
			addDialog(dialog: Omit<TldrawUiDialog, 'id'> & { id?: string }) {
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
		<TldrawUiDialogsContext.Provider value={content}>
			{children}
			<TldrawUiDialogsRenderer />
		</TldrawUiDialogsContext.Provider>
	)
}

/** @public */
export function useTldrawUiDialogs(): TldrawUiDialogsContextValue {
	const ctx = useContext(TldrawUiDialogsContext)

	if (!ctx) {
		throw new Error('useTldrawUiDialogs must be used within a TldrawUiDialogsProvider')
	}

	return ctx
}

const TldrawUiManagedDialog = memo(function TldrawUiManagedDialog({
	id,
	component: ModalContent,
	preventBackgroundClose,
}: TldrawUiDialog) {
	const { removeDialog } = useTldrawUiDialogs()

	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			if (!isOpen) {
				removeDialog(id)
			}
		},
		[id, removeDialog]
	)

	return (
		<TldrawUiDialogRoot
			defaultOpen
			onOpenChange={handleOpenChange}
			preventBackgroundClose={preventBackgroundClose}
		>
			<ModalContent onClose={() => handleOpenChange(false)} />
		</TldrawUiDialogRoot>
	)
})

const TldrawUiDialogsRenderer = memo(function TldrawUiDialogsRenderer() {
	const { dialogs } = useTldrawUiDialogs()
	const dialogsArray = useValue('tl-dialogs', () => dialogs.get(), [dialogs])

	return (
		<>
			{dialogsArray.map((dialog) => (
				<TldrawUiManagedDialog key={dialog.id} {...dialog} />
			))}
		</>
	)
})
