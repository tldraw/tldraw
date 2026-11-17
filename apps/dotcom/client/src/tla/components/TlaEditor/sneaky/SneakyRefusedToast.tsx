import { useEffect } from 'react'
import { defineMessages, useEditor, useToasts, useTranslation } from 'tldraw'

const messages = defineMessages({
	refused: { defaultMessage: "You don't have permission to make that change." },
})

/**
 * Tells the user when a change was refused and rolled back, by the editor or by the room. The
 * editor usually refuses first; a room refusal means the client's permissions were out of date.
 */
export function SneakyRefusedToast() {
	const editor = useEditor()
	const { addToast } = useToasts()
	const msg = useTranslation()
	const title = msg(messages.refused)
	useEffect(() => {
		const onRefused = () => addToast({ id: 'change-refused', severity: 'warning', title })
		editor.on('refused', onRefused)
		return () => {
			editor.off('refused', onRefused)
		}
	}, [editor, addToast, title])
	return null
}
