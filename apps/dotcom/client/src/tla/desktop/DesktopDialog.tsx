import { atom, useValue } from 'tldraw'

export interface DialogState {
	title: string
	body: string
}

export const dialogAtom = atom<DialogState | null>('desktop:dialog', null)

export function showDialog(state: DialogState) {
	dialogAtom.set(state)
}

export function dismissDialog() {
	dialogAtom.set(null)
}

const OK_LABEL = 'OK'

export function showInsertDiskDialog() {
	showDialog({
		title: 'Insert disk',
		body: 'Please insert a floppy disk to continue.',
	})
}

export function DesktopDialog() {
	const state = useValue('desktop-dialog', () => dialogAtom.get(), [])
	if (!state) return null
	return (
		<div className="desktop__dialog-overlay" onPointerDown={dismissDialog}>
			<div
				className="desktop-dialog"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="desktop-dialog-title"
				onPointerDown={(e) => e.stopPropagation()}
			>
				<div className="desktop-dialog__title" id="desktop-dialog-title">
					{state.title}
				</div>
				<div className="desktop-dialog__body">{state.body}</div>
				<div className="desktop-dialog__actions">
					<button
						type="button"
						className="desktop-dialog__button"
						autoFocus
						onClick={dismissDialog}
					>
						{OK_LABEL}
					</button>
				</div>
			</div>
		</div>
	)
}
