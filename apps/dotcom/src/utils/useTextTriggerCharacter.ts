import { useEditor } from 'tldraw'
import { useEmojis } from '../hooks/useEmojis'

export function useTextTriggerCharacter(
	inputEl: HTMLTextAreaElement | null,
	onComplete: (text: string) => void
) {
	const editor = useEditor()
	const { onKeyDown } = useEmojis(editor, inputEl, onComplete)

	// N.B. We could chain multiple onKeyDown handlers here if we wanted to (say, for hashtags, or @-mentions)
	// const { onKeyDown: onKeyDown2 } = useSomeOtherHook(editor, inputEl, onComplete)
	// return { onKeyDown: (e, coords) => onKeyDown(e, coords) && onKeyDown2(e, coords) }

	return { onKeyDown }
}
