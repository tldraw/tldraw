import '../../styles/globals.css'
import { IFrameProtector, ROOM_CONTEXT } from '../components/IFrameProtector'
import { LocalEditor } from '../components/LocalEditor'

export function Component() {
	return (
		<>
			<a href="/q/local">Local</a>
			<IFrameProtector slug="home" context={ROOM_CONTEXT.LOCAL}>
				<LocalEditor />
			</IFrameProtector>
		</>
	)
}
