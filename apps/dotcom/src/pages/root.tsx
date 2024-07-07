import '../../styles/globals.css'
import { TlaSidebarWrapper } from '../components-tla/TlaSidebarWrapper'
import { IFrameProtector, ROOM_CONTEXT } from '../components/IFrameProtector'
import { LocalEditor } from '../components/LocalEditor'

export function Component() {
	return (
		<IFrameProtector slug="home" context={ROOM_CONTEXT.LOCAL}>
			<TlaSidebarWrapper>
				<LocalEditor />
			</TlaSidebarWrapper>
		</IFrameProtector>
	)
}
