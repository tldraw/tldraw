import { getFirstCharacter, TLUserId, usePresence } from '@tldraw/editor'

/** @public */
export interface TLUiPeopleMenuAvatarProps {
	userId: TLUserId
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
			{getFirstCharacter(presence.userName ?? '')}
		</div>
	)
}
