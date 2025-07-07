import { uniqueId } from 'tldraw'

export function getLocalUserId() {
	let localUserId = uniqueId()

	const localUserIdInLocalStorage = localStorage.getItem('localUserId')
	if (localUserIdInLocalStorage) {
		localUserId = localUserIdInLocalStorage
	} else {
		localStorage.setItem('localUserId', localUserId)
	}

	return localUserId
}
