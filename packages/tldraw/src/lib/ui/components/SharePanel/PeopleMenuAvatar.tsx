import { usePresence } from '@tldraw/editor'

export function PeopleMenuAvatar({ userId }: { userId: string }) {
	const presence = usePresence(userId)

	if (!presence) return null
	return (
		<div
			className="tlui-people-menu__avatar"
			key={userId}
			style={{
				backgroundColor: presence.color,
			}}
		>
			{presence.userName?.[0] ?? ''}
		</div>
	)
}
