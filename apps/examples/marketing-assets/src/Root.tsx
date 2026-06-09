import { Navigate } from 'react-router-dom'
import { uniqueId } from 'tldraw'
import { getLocalStorageItem, setLocalStorageItem } from './localStorage'

// Land each visitor in a room. We remember the last room this browser used so a
// reload returns to the same canvas; share the URL to collaborate with others.
const myRoomId = getLocalStorageItem('marketing-assets-room-id') ?? 'room-' + uniqueId()
setLocalStorageItem('marketing-assets-room-id', myRoomId)

export function Root() {
	return <Navigate to={`/${myRoomId}`} replace />
}
