import '../../styles/globals.css'
import { IFrameProtector } from '../components/IFrameProtector'
import { LocalEditor } from '../components/LocalEditor'

export function Component() {
	return (
		<IFrameProtector slug="home" context="local">
			<LocalEditor />
		</IFrameProtector>
	)
}
