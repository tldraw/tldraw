'use client'

// ActionMenu Component
// Reusable dropdown action menu built with shadcn DropdownMenu

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import React from 'react'

export interface ActionMenuItem {
	label: string
	onClick: () => void
	icon?: React.ReactNode
	disabled?: boolean
	destructive?: boolean
	divider?: boolean
}

interface ActionMenuProps {
	items: ActionMenuItem[]
	trigger?: React.ReactNode
	className?: string
	ariaLabel?: string
}

export function ActionMenu({
	items,
	trigger,
	className = '',
	ariaLabel = 'Open menu',
}: ActionMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={`p-1 rounded hover:bg-accent transition-colors ${className}`}
				aria-label={ariaLabel}
				onClick={(e) => e.stopPropagation()}
			>
				{trigger || (
					<svg
						className="w-5 h-5 text-muted-foreground"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
						/>
					</svg>
				)}
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
				{items.map((item, index) => {
					if (item.divider) {
						return <DropdownMenuSeparator key={`divider-${index}`} />
					}

					return (
						<DropdownMenuItem
							key={item.label}
							onClick={(e) => {
								e.stopPropagation()
								item.onClick()
							}}
							disabled={item.disabled}
							className={item.destructive ? 'text-destructive focus:text-destructive' : ''}
						>
							{item.icon && <span className="w-4 h-4">{item.icon}</span>}
							{item.label}
						</DropdownMenuItem>
					)
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
