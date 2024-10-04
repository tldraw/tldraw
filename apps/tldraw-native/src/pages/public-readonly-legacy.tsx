import { ROOM_OPEN_MODE } from '@tldraw/dotcom-shared'
import { useParams } from 'react-router-dom'
import '../../styles/globals.css'
import { IFrameProtector, ROOM_CONTEXT } from '../components/IFrameProtector'
import { MultiplayerEditor } from '../components/MultiplayerEditor'

export function Component() {
	const id = useParams()['roomId'] as string
	return (
		<IFrameProtector slug={id} context={ROOM_CONTEXT.PUBLIC_READONLY}>
			<MultiplayerEditor roomOpenMode={ROOM_OPEN_MODE.READ_ONLY_LEGACY} roomSlug={id} />
		</IFrameProtector>
	)
}
