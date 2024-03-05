import { useEditor } from 'tldraw'
import { useEmojis } from '../hooks/useEmojis'

export function useTextTriggerCharacter(
	inputEl: HTMLTextAreaElement | null,
	onComplete: (text: string) => void
) {
	const editor = useEditor()
	const { onKeyDown } = useEmojis(editor, inputEl, onComplete)

	return { onKeyDown }
}
