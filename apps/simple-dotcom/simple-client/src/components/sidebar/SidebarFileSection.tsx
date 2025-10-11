'use client'

import { Pin } from 'lucide-react'
import { ReactNode } from 'react'
import { SIDEBAR_ITEM_BASE } from './sidebar-styles'

interface SidebarFileSectionProps {
	title: string
	iconLeft?: 'pin' // Icon identifier (expandable in future)
	children: ReactNode
}

/**
 * SidebarFileSection
 *
 * Renders a section header with optional icon for grouped sidebar items.
 * Used for time-based grouping (Today, Yesterday, etc.) and pinned items.
 *
 * Features:
 * - Section title styled like a low-opacity sidebar item
 * - Optional left icon (pin for Pinned section)
 * - Semantic HTML (heading + list structure)
 * - Conditional rendering (only shown when section has items)
 * - Items within section use depth indicators for visual hierarchy
 */
export function SidebarFileSection({ title, iconLeft, children }: SidebarFileSectionProps) {
	const Icon = iconLeft === 'pin' ? Pin : null

	return (
		<div className="flex flex-col mb-2">
			<div className={`${SIDEBAR_ITEM_BASE} pl-2`}>
				{Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/80" aria-hidden="true" />}
				<h2 className="pl-1 text-sm text-muted-foreground/80">{title}</h2>
			</div>
			<div role="list" aria-label={title}>
				{children}
			</div>
		</div>
	)
}
