import { useParams } from 'react-router-dom'
import '../../styles/globals.css'
import { IFrameProtector } from '../components/IFrameProtector'
import { MultiplayerEditor } from '../components/MultiplayerEditor'

export function Component() {
	const id = useParams()['roomId'] as string
	return (
		<IFrameProtector slug={id} context="public-readonly">
			<MultiplayerEditor readonlyStatus="readonly-legacy" roomSlug={id} />
		</IFrameProtector>
	)
}
