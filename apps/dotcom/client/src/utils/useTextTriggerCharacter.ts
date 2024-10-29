import { useBreakpoint, useEditor } from 'tldraw'
import { useEmojis } from '../hooks/useEmojis'

export function useTextTriggerCharacter(
	inputEl: HTMLTextAreaElement | null,
	onComplete: (text: string) => void
) {
	const breakpoint = useBreakpoint()
	const editor = useEditor()
	const { onKeyDown } = useEmojis(editor, inputEl, onComplete)

	if (breakpoint < 5 /* PORTRAIT_BREAKPOINT.TABLET_SM */) {
		// We don't support emojis on mobile because mobile devices
		// have emoji keyboards built in to them.
		return {
			onKeyDown: async () => {
				return false
			},
		}
	}

	// N.B. We could chain multiple onKeyDown handlers here if we wanted to (say, for hashtags, or @-mentions)
	// const { onKeyDown: onKeyDown2 } = useSomeOtherHook(editor, inputEl, onComplete)
	// return { onKeyDown: (e, coords) => onKeyDown(e, coords) && onKeyDown2(e, coords) }

	return { onKeyDown }
}
