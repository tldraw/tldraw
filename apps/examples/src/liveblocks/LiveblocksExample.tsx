import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { RoomProvider } from './liveblocks.config'
import { useLiveblocksStore } from './useLiveblocksStore'

export default function LiveblocksExample() {
	return (
		<RoomProvider id="example-1" initialPresence={{}}>
			<InsideOfRoomContext />
		</RoomProvider>
	)
}

export function InsideOfRoomContext() {
	const store = useLiveblocksStore()

	return (
		<div className="tldraw__editor">
			<Tldraw store={store} autoFocus />
		</div>
	)
}
