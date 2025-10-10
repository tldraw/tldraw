'use client'

// UserAvatar Component
// Displays user avatar with initials or image using shadcn/ui Avatar

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
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
	showTooltip?: boolean
}

const sizeClasses = {
	sm: 'h-8 w-8 text-xs',
	md: 'h-10 w-10 ',
	lg: 'h-12 w-12 text-base',
}

export function UserAvatar({
	user,
	size = 'md',
	className = '',
	showTooltip = true,
}: UserAvatarProps) {
	const initials = getUserInitials(user)
	const bgColor = getUserAvatarColor(user?.id)

	const avatarElement = (
		<Avatar className={cn(sizeClasses[size], className)}>
			<AvatarImage src={user?.avatar_url || undefined} alt={initials} />
			<AvatarFallback className={cn(bgColor, 'text-white font-medium')}>{initials}</AvatarFallback>
		</Avatar>
	)

	if (!showTooltip || !user) {
		return avatarElement
	}

	const displayName = user.display_name || user.name || user.email
	const showEmail = (user.display_name || user.name) && user.email

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="cursor-default">{avatarElement}</div>
			</TooltipTrigger>
			<TooltipContent>
				<div className="text-center">
					<p>{displayName}</p>
					{showEmail && <p className="text-xs text-muted-foreground">{user.email}</p>}
				</div>
			</TooltipContent>
		</Tooltip>
	)
}
