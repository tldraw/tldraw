export function PeopleMenuAvatar({ userId }: { userId: string }) {
	//const presence = usePresence(userId)
	const presence = {
		color: 'red',
		userName: 'New User',
	}

	if (!presence) return null
	return (
		<div
			className="tlui-people-menu__avatar"
			key={userId}
			style={{
				backgroundColor: presence.color,
			}}
		>
			{presence.userName === 'New User' ? '' : presence.userName[0] ?? ''}
		</div>
	)
}
