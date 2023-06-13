import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { useYjsStore } from './useYjsStore'

const HOST_URL =
	process.env.NODE_ENV === 'development' ? 'ws://localhost:1234' : 'wss://demos.yjs.dev'

export default function YjsExample() {
	const store = useYjsStore({
		roomId: 'example',
		hostUrl: HOST_URL,
		version: 3,
	})

	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus store={store} />
		</div>
	)
}
