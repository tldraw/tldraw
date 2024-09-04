import { DefaultHelperButtons, Timer, track } from 'tldraw'
import { showTimer } from './Timer'

export const HelperButtons = track(function HelperButtons() {
	return (
		<>
			{showTimer.get() && <Timer />}
			<DefaultHelperButtons />
		</>
	)
})
