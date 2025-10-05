'use client'

// UserBadge Component
// Displays user name with avatar for presence/metadata displays

import { formatUserDisplayName } from './formatUserDisplayName'
import { UserAvatar } from './UserAvatar'

interface UserBadgeProps {
	user?: {
		id?: string
		name?: string | null
		display_name?: string | null
		email?: string
		avatar_url?: string | null
	} | null
	showAvatar?: boolean
	size?: 'sm' | 'md' | 'lg'
	className?: string
	role?: 'owner' | 'member' | null
}

export function UserBadge({
	user,
	showAvatar = true,
	size = 'md',
	className = '',
	role,
}: UserBadgeProps) {
	const displayName = formatUserDisplayName(user)

	const textSizeClasses = {
		sm: 'text-sm',
		md: 'text-base',
		lg: 'text-lg',
	}

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			{showAvatar && <UserAvatar user={user} size={size} />}
			<div className="flex items-center gap-1">
				<span className={`${textSizeClasses[size]} text-gray-900 dark:text-gray-100`}>
					{displayName}
				</span>
				{role === 'owner' && (
					<span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
						Owner
					</span>
				)}
			</div>
		</div>
	)
}
