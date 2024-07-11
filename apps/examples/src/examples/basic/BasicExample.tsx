import { useMultiplayerDemo } from '@tldraw/sync'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function BasicExample() {
	const store = useMultiplayerDemo({ roomId: 'adam' })
	return (
		<div className="tldraw__editor">
			<Tldraw store={store} />
		</div>
	)
}
