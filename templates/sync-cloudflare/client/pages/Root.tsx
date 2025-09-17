import { Navigate } from 'react-router-dom'
import { uniqueId } from 'tldraw'
import { getLocalStorageItem, setLocalStorageItem } from '../localStorage'

const myLocalRoomId = getLocalStorageItem('my-local-room-id') ?? 'test-room-' + uniqueId()
setLocalStorageItem('my-local-room-id', myLocalRoomId)

export function Root() {
	return <Navigate to={`/${myLocalRoomId}`} />
}
