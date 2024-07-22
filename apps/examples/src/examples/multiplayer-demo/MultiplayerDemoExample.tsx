import { useSyncDemo } from '@tldraw/sync'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function MultiplayerDemoExample({ roomId }: { roomId: string }) {
	const store = useSyncDemo({ roomId })
	return (
		<div className="tldraw__editor">
			<Tldraw store={store} />
		</div>
	)
}
