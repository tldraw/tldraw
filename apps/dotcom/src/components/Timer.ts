import { Editor, atom } from 'tldraw'

export const showTimer = atom('timer', false)

export function initializeTimer(editor: Editor) {
	let meta = editor.getDocumentSettings().meta as any
	if (!meta.timer || meta.timer.initialTime === undefined) {
		meta = {
			...meta,
			timer: {
				initialTime: 30 * 1000,
				remainingTime: 30 * 1000,
				state: { state: 'stopped' },
			},
		}
		editor.updateDocumentSettings({
			meta,
		})
	}
}
