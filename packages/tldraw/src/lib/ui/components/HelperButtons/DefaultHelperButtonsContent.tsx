import { BackToContent } from './BackToContent'
import { ExitPenMode } from './ExitPenMode'
import { StopFollowing } from './StopFollowing'

/** @public */
export function DefaultHelperButtonsContent() {
	return (
		<>
			<ExitPenMode />
			<BackToContent />
			<StopFollowing />
		</>
	)
}
