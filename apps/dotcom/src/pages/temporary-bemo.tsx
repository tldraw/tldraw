import { useParams } from 'react-router-dom'
import '../../styles/globals.css'
import { IFrameProtector, ROOM_CONTEXT } from '../components/IFrameProtector'
import { TemporaryBemoDevEditor } from '../components/TemporaryBemoDevEditor'

export function Component() {
	const id = useParams()['roomId'] as string
	return (
		<IFrameProtector slug={id} context={ROOM_CONTEXT.PUBLIC_MULTIPLAYER}>
			<TemporaryBemoDevEditor slug={id} />
		</IFrameProtector>
	)
}
