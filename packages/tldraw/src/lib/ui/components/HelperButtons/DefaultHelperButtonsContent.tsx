import { BackToContent } from './BackToContent'
import { ExitPenMode } from './ExitPenMode'
import { StopFollowing } from './StopFollowing'

/** @public @react */
export function DefaultHelperButtonsContent() {
	return (
		<>
			<ExitPenMode />
			<BackToContent />
			<StopFollowing />
		</>
	)
}
