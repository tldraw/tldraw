'use client'

// ActionMenu Component
// Reusable dropdown action menu

import React, { useEffect, useRef, useState } from 'react'

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
	const [isOpen, setIsOpen] = useState(false)
	const menuRef = useRef<HTMLDivElement>(null)
	const buttonRef = useRef<HTMLButtonElement>(null)

	// Close menu when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				menuRef.current &&
				!menuRef.current.contains(event.target as Node) &&
				buttonRef.current &&
				!buttonRef.current.contains(event.target as Node)
			) {
				setIsOpen(false)
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside)
			return () => document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isOpen])

	// Close menu on escape
	useEffect(() => {
		function handleEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setIsOpen(false)
			}
		}

		if (isOpen) {
			document.addEventListener('keydown', handleEscape)
			return () => document.removeEventListener('keydown', handleEscape)
		}
	}, [isOpen])

	const handleItemClick = (item: ActionMenuItem) => {
		if (!item.disabled) {
			item.onClick()
			setIsOpen(false)
		}
	}

	return (
		<div className={`relative ${className}`}>
			<button
				ref={buttonRef}
				onClick={(e) => {
					e.stopPropagation()
					setIsOpen(!isOpen)
				}}
				className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				aria-label={ariaLabel}
			>
				{trigger || (
					<svg
						className="w-5 h-5 text-gray-500 dark:text-gray-400"
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
			</button>

			{isOpen && (
				<div
					ref={menuRef}
					className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="py-1" role="menu">
						{items.map((item, index) => {
							if (item.divider) {
								return (
									<div key={index} className="border-t border-gray-100 dark:border-gray-700 my-1" />
								)
							}

							return (
								<button
									key={index}
									onClick={() => handleItemClick(item)}
									disabled={item.disabled}
									className={`
										w-full text-left px-4 py-2 text-sm flex items-center gap-2
										${
											item.destructive
												? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
												: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
										}
										${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
										transition-colors
									`}
									role="menuitem"
								>
									{item.icon && <span className="w-4 h-4">{item.icon}</span>}
									{item.label}
								</button>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}
