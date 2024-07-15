import { useMultiplayerSync } from '@tldraw/sync'
import { createRoot } from 'react-dom/client'
import {
	Route,
	RouterProvider,
	createBrowserRouter,
	createRoutesFromElements,
	useParams,
} from 'react-router-dom'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function Editor() {
	const { roomId } = useParams()
	const store = useMultiplayerSync({
		uri: 'ws://localhost:5858/connect/' + roomId,
	})
	return <Tldraw store={store} />
}

createRoot(document.getElementById('root')!).render(
	<RouterProvider
		router={createBrowserRouter(
			createRoutesFromElements(
				<>
					<Route path="/:roomId" Component={() => <Editor />} />
					<Route
						path="/"
						Component={() => {
							return (
								<div style={{ padding: 20 }}>
									<h1>TLDraw</h1>
									<p>
										Open a room by going to <code>/:roomId</code>
									</p>
									<p>
										e.g. <a href="/hello_world">{location.host}/hello_world</a>
									</p>
								</div>
							)
						}}
					/>
				</>
			)
		)}
	/>
)
