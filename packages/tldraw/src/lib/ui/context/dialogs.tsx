import { Atom, Editor, tlmenus, uniqueId, useAtom } from '@tldraw/editor'
import { ComponentType, ReactNode, createContext, useContext, useMemo } from 'react'
import { useUiEvents } from './events'

/** @public */
export interface TLUiDialogProps {
	onClose(): void
}

/** @public */
export interface TLUiDialog {
	id: string
	onClose?(): void
	component: ComponentType<TLUiDialogProps>
	preventBackgroundClose?: boolean
}

/** @public */
export interface TLUiDialogsContextType {
	addDialog(dialog: Omit<TLUiDialog, 'id'> & { id?: string }): string
	removeDialog(id: string): string
	clearDialogs(): void
	dialogs: Atom<TLUiDialog[]>
}

/** @internal */
export const DialogsContext = createContext<TLUiDialogsContextType | null>(null)

/** @public */
export interface TLUiDialogsProviderProps {
	context?: string
	overrides?(editor: Editor): TLUiDialogsContextType
	children: ReactNode
}

/** @public @react */
export function TldrawUiDialogsProvider({ context, children }: TLUiDialogsProviderProps) {
	const ctx = useContext(DialogsContext)
	const trackEvent = useUiEvents()

	const dialogs = useAtom<TLUiDialog[]>('dialogs', [])

	const content = useMemo(() => {
		return {
			dialogs,
			addDialog(dialog: Omit<TLUiDialog, 'id'> & { id?: string }) {
				const id = dialog.id ?? uniqueId()
				dialogs.update((d) => {
					return [...d.filter((m) => m.id !== dialog.id), { ...dialog, id }]
				})
				trackEvent('open-menu', { source: 'dialog', id })
				tlmenus.addOpenMenu(id, context)
				return id
			},
			removeDialog(id: string) {
				const dialog = dialogs.get().find((d) => d.id === id)
				if (dialog) {
					dialog.onClose?.()
					trackEvent('close-menu', { source: 'dialog', id })
					tlmenus.deleteOpenMenu(id, context)
					dialogs.update((d) => d.filter((m) => m !== dialog))
				}
				return id
			},
			clearDialogs() {
				const current = dialogs.get()
				if (current.length === 0) return
				current.forEach((d) => {
					d.onClose?.()
					trackEvent('close-menu', { source: 'dialog', id: d.id })
					tlmenus.deleteOpenMenu(d.id, context)
				})
				dialogs.set([])
			},
		}
	}, [trackEvent, dialogs, context])

	// if the user has already provided a context higher up, reuse that one
	if (ctx) return <>{children}</>

	return <DialogsContext.Provider value={content}>{children}</DialogsContext.Provider>
}

/** @public */
export function useDialogs() {
	const ctx = useContext(DialogsContext)

	if (!ctx) {
		throw new Error('useDialogs must be used within a DialogsProvider')
	}

	return ctx
}
