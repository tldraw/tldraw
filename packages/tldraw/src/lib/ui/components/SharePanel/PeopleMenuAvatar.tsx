import { usePresence } from '@tldraw/editor'

/** @public */
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

const avatarSizeClasses: Record<AvatarSize, string> = {
	sm: 'tlui-people-menu__avatar--sm',
	md: 'tlui-people-menu__avatar--md',
	lg: 'tlui-people-menu__avatar--lg',
	xl: 'tlui-people-menu__avatar--xl',
}

export interface PeopleMenuAvatarProps {
	/** The ID of the user */
	userId: string
	/** The size of the avatar. Defaults to 'md' */
	size?: AvatarSize
}

export function PeopleMenuAvatar({ userId, size = 'md' }: PeopleMenuAvatarProps) {
	const presence = usePresence(userId)

	if (!presence) return null

	return (
		<div
			className={`tlui-people-menu__avatar ${avatarSizeClasses[size]}`}
			key={userId}
			style={{
				backgroundColor: presence.avatar ? 'transparent' : presence.color,
				backgroundImage: presence.avatar ? `url(${presence.avatar})` : undefined,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
			}}
		>
			{!presence.avatar && (presence.userName?.[0] ?? '')}
		</div>
	)
}
