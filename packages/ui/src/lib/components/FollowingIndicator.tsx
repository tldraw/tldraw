import { useEditor, usePresence } from '@tldraw/editor'
import { useValue } from 'signia-react'

export function FollowingIndicator() {
	const app = useEditor()
	const followingUserId = useValue('follow', () => app.instanceState.followingUserId, [app])
	if (!followingUserId) return null
	return <FollowingIndicatorInner userId={followingUserId} />
}

function FollowingIndicatorInner({ userId }: { userId: string }) {
	const presence = usePresence(userId)
	if (!presence) return null
	return <div className="tlui-following" style={{ borderColor: presence.color }} />
}
