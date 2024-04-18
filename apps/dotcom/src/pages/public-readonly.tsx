import { useParams } from 'react-router-dom'
import { RoomOpenMode } from 'tldraw'
import '../../styles/globals.css'
import { IFrameProtector } from '../components/IFrameProtector'
import { MultiplayerEditor } from '../components/MultiplayerEditor'

export function Component() {
	const id = useParams()['roomId'] as string
	return (
		<IFrameProtector slug={id} context="public-readonly">
			<MultiplayerEditor roomOpenMode={RoomOpenMode.READ_ONLY} roomSlug={id} />
		</IFrameProtector>
	)
}
