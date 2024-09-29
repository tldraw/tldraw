import { JSX, ReactNode } from 'react'
import { atom, useValue } from 'tldraw'
import { TlaDialog } from '../components/TlaDialog.tsx/TlaDialog'
import { TlaRenameFileDialog } from '../components/dialogs/TlaRenameFileDialog'
import { TldrawAppFileRecordType } from '../utils/schema/TldrawAppFile'

export interface TldrawAppDialog {
	id: string
	onClose?(): void
	Component(props: { onClose?(): void }): JSX.Element
}

export const dialogsAtom = atom<TldrawAppDialog[]>('dialogs', [
	{
		id: 'rename',
		Component: () => {
			return <TlaRenameFileDialog fileId={TldrawAppFileRecordType.createId('0')} />
		},
	},
])

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
