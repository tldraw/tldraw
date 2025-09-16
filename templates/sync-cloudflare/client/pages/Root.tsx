import { Navigate } from 'react-router-dom'
import { uniqueId } from 'tldraw'

const myLocalRoomId = localStorage.getItem('my-local-room-id') ?? 'test-room-' + uniqueId()
localStorage.setItem('my-local-room-id', myLocalRoomId)

export function Root() {
	return <Navigate to={`/${myLocalRoomId}`} />
}
