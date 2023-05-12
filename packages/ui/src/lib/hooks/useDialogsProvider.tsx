import { App, uniqueId, useApp } from '@tldraw/editor'
import { createContext, useCallback, useContext, useState } from 'react'
import { useEvents } from './useEventsProvider'

/** @public */
export interface DialogProps {
	onClose: () => void
}

/** @public */
export interface TLDialog {
	id: string
	onClose?: () => void
	component: (props: DialogProps) => any
}

/** @public */
export type DialogsContextType = {
	addDialog: (dialog: Omit<TLDialog, 'id'> & { id?: string }) => string
	removeDialog: (id: string) => string
	updateDialog: (id: string, newDialogData: Partial<TLDialog>) => string
	clearDialogs: () => void
	dialogs: TLDialog[]
}

/** @public */
export const DialogsContext = createContext({} as DialogsContextType)

/** @public */
export type DialogsProviderProps = {
	overrides?: (app: App) => DialogsContextType
	children: any
}

/** @public */
export function DialogsProvider({ children }: DialogsProviderProps) {
	const app = useApp()
	const trackEvent = useEvents()

	const [dialogs, setDialogs] = useState<TLDialog[]>([])

	const addDialog = useCallback(
		(dialog: Omit<TLDialog, 'id'> & { id?: string }) => {
			const id = dialog.id ?? uniqueId()
			setDialogs((d) => {
				return [...d.filter((m) => m.id !== dialog.id), { ...dialog, id }]
			})

			trackEvent('open-menu', { source: 'dialog', id })
			app.addOpenMenu(id)

			return id
		},
		[app, trackEvent]
	)

	const updateDialog = useCallback(
		(id: string, newDialogData: Partial<TLDialog>) => {
			setDialogs((d) =>
				d.map((m) => {
					if (m.id === id) {
						return {
							...m,
							...newDialogData,
						}
					}
					return m
				})
			)

			trackEvent('open-menu', { source: 'dialog', id })
			app.addOpenMenu(id)

			return id
		},
		[app, trackEvent]
	)

	const removeDialog = useCallback(
		(id: string) => {
			setDialogs((d) =>
				d.filter((m) => {
					if (m.id === id) {
						m.onClose?.()
						return false
					}
					return true
				})
			)

			trackEvent('close-menu', { source: 'dialog', id })
			app.deleteOpenMenu(id)

			return id
		},
		[app, trackEvent]
	)

	const clearDialogs = useCallback(() => {
		setDialogs((d) => {
			d.forEach((m) => {
				m.onClose?.()
				trackEvent('close-menu', { source: 'dialog', id: m.id })
				app.deleteOpenMenu(m.id)
			})
			return []
		})
	}, [app, trackEvent])

	return (
		<DialogsContext.Provider
			value={{ dialogs, addDialog, removeDialog, clearDialogs, updateDialog }}
		>
			{children}
		</DialogsContext.Provider>
	)
}

/** @public */
export function useDialogs() {
	const ctx = useContext(DialogsContext)

	if (!ctx) {
		throw new Error('useDialogs must be used within a DialogsProvider')
	}

	return ctx
}
