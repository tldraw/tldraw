import { usePresence } from '@tldraw/editor'

export function PeopleMenuAvatar({ userId }: { userId: string }) {
	const presence = usePresence(userId)

	if (!presence) return null
	return (
		<div
			className="tlui-people-menu__avatar"
			key={userId}
			style={{
				background: !!presence.avatar
					? `url(${presence.avatar}) center/cover no-repeat`
					: presence.color,
			}}
		>
			{presence.userName?.[0] ?? ''}
		</div>
	)
}
