import { usePresence } from '@tldraw/editor'

/** @public */
export interface TLUiPeopleMenuAvatarProps {
	userId: string
}

/** @public @react */
export function DefaultPeopleMenuAvatar({ userId }: TLUiPeopleMenuAvatarProps) {
	const presence = usePresence(userId)

	if (!presence) return null
	return (
		<div
			className="tlui-people-menu__avatar"
			style={{
				backgroundColor: presence.color,
			}}
		>
			{presence.userName?.[0] ?? ''}
		</div>
	)
}
