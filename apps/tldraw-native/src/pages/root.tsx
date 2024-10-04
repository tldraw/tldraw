import '../../styles/globals.css'
import { IFrameProtector, ROOM_CONTEXT } from '../components/IFrameProtector'
import { LocalEditor } from '../components/LocalEditor'

export function Component() {
	return (
		<IFrameProtector slug="home" context={ROOM_CONTEXT.LOCAL}>
			<LocalEditor />
		</IFrameProtector>
	)
}
