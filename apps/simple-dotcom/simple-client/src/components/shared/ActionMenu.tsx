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
import { cn } from '@/lib/utils'
import { EllipsisVerticalIcon } from 'lucide-react'
import React from 'react'
import { SIDEBAR_MENU_BUTTON } from '../sidebar/sidebar-styles'
import { Button } from '../ui/button'

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
	tooltipText?: string
	onOpenChange?: (open: boolean) => void
}

export function ActionMenu({
	items,
	trigger,
	className = '',
	ariaLabel = 'Open menu',
	tooltipText = 'Actions',
	onOpenChange,
}: ActionMenuProps) {
	const [open, setOpen] = React.useState(false)

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		onOpenChange?.(newOpen)
	}

	return (
		<DropdownMenu open={open} onOpenChange={handleOpenChange}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="include"
					size="icon"
					title={tooltipText}
					className={cn(SIDEBAR_MENU_BUTTON, 'w-10 -ml-2', className)}
					aria-label={ariaLabel}
					onClick={(e) => e.stopPropagation()}
				>
					{trigger || <EllipsisVerticalIcon className="size-4" />}
				</Button>
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
							{item.icon && <span className="size-4">{item.icon}</span>}
							{item.label}
						</DropdownMenuItem>
					)
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
