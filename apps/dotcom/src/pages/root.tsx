import '../../styles/globals.css'
import { TlaAuthBoundary } from '../components-tla/TlaAuthBoundary'
import { IFrameProtector, ROOM_CONTEXT } from '../components/IFrameProtector'
import { LocalEditor } from '../components/LocalEditor'

export function Component() {
	return (
		<IFrameProtector slug="home" context={ROOM_CONTEXT.LOCAL}>
			<TlaAuthBoundary>
				<LocalEditor />
			</TlaAuthBoundary>
		</IFrameProtector>
	)
}
