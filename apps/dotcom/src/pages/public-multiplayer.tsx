import { useParams } from 'react-router-dom'
import '../../styles/globals.css'
import { MultiplayerEditor } from '../components/MultiplayerEditor'

export function Component() {
	const id = useParams()['roomId'] as string
	return <MultiplayerEditor isReadOnly={false} roomSlug={id} />
}
