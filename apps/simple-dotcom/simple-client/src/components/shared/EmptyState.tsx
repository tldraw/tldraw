'use client'

// EmptyState Component
// Reusable empty state display

import React from 'react'

interface EmptyStateProps {
	icon?: React.ReactNode
	title: string
	description?: string
	action?: {
		label: string
		onClick: () => void
		disabled?: boolean
	}
	className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
	return (
		<div
			className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
		>
			{icon && <div className="mb-4 text-gray-400 dark:text-gray-600">{icon}</div>}

			<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">{title}</h3>

			{description && (
				<p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">{description}</p>
			)}

			{action && (
				<button
					onClick={action.onClick}
					disabled={action.disabled}
					className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{action.label}
				</button>
			)}
		</div>
	)
}
