export function ChevronRight({ className = 'h-3.5 w-3.5' }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<path d="M5 12h14M12 5l7 7-7 7" />
		</svg>
	)
}

export function ChevronLeft({ className = 'h-3.5 w-3.5' }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<path d="M19 12H5M12 19l-7-7 7-7" />
		</svg>
	)
}

export function ChevronDown({ className = 'h-3.5 w-3.5' }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			strokeWidth={2.5}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<path d="M6 9l6 6 6-6" />
		</svg>
	)
}
