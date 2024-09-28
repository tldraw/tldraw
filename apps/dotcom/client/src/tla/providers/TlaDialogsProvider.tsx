import { JSX, ReactNode } from 'react'
import { atom, useValue } from 'tldraw'
import { TlaDialog } from '../components/TlaDialog.tsx/TlaDialog'

export interface TldrawAppDialog {
	id: string
	onClose?(): void
	Component(props: { onClose?(): void }): JSX.Element
}

export const dialogsAtom = atom<TldrawAppDialog[]>('dialogs', [])

export function TlaDialogsProvider({ children }: { children: ReactNode }) {
	const dialogs = useValue('dialogs', () => dialogsAtom.get(), [])

	return (
		<>
			{children}
			{dialogs.map((dialog) => (
				<TlaDialog key={dialog.id} dialog={dialog} />
			))}
		</>
	)
}
