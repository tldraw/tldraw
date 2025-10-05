'use client'

// UserAvatar Component
// Displays user avatar with initials or image

import { getUserAvatarColor, getUserInitials } from './formatUserDisplayName'

interface UserAvatarProps {
	user?: {
		id?: string
		name?: string | null
		display_name?: string | null
		email?: string
		avatar_url?: string | null
	} | null
	size?: 'sm' | 'md' | 'lg'
	className?: string
}

const sizeClasses = {
	sm: 'h-8 w-8 text-xs',
	md: 'h-10 w-10 text-sm',
	lg: 'h-12 w-12 text-base',
}

export function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
	const initials = getUserInitials(user)
	const bgColor = getUserAvatarColor(user?.id)

	// If user has an avatar URL, show the image
	if (user?.avatar_url) {
		return (
			<div
				className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 ${className}`}
			>
				<img
					src={user.avatar_url}
					alt={initials}
					className="h-full w-full object-cover"
					onError={(e) => {
						// If image fails to load, hide it to show initials fallback
						const target = e.target as HTMLImageElement
						target.style.display = 'none'
					}}
				/>
				{/* Fallback to initials if image fails */}
				<div
					className={`h-full w-full ${bgColor} text-white flex items-center justify-center font-medium`}
				>
					{initials}
				</div>
			</div>
		)
	}

	// Default: Show initials
	return (
		<div
			className={`${sizeClasses[size]} ${bgColor} text-white rounded-full flex items-center justify-center font-medium flex-shrink-0 ${className}`}
		>
			{initials}
		</div>
	)
}
