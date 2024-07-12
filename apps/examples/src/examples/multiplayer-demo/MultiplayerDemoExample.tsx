import { useMultiplayerDemo } from '@tldraw/sync'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function MultiplayerDemoExample({ roomId }: { roomId: string }) {
	const store = useMultiplayerDemo({ roomId })
	return (
		<div className="tldraw__editor">
			<Tldraw store={store} />
		</div>
	)
}
