import { DefaultHelperButtons, Timer, track, useEditor } from 'tldraw'
import { showTimer } from './Timer'

export const HelperButtons = track(function HelperButtons() {
	const editor = useEditor()
	const timer = editor.getDocumentSettings().meta.timer as any
	return (
		<>
			{showTimer.get() && timer && timer.initialTime && <Timer props={timer} />}
			<DefaultHelperButtons />
		</>
	)
})
