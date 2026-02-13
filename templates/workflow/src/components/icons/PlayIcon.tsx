export function PlayIcon({ className }: { className?: string }) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M4 2L14 8L4 14 Z"
				fill="currentColor"
				stroke="currentColor"
				strokeWidth={2}
				fillRule="evenodd"
				clipRule="evenodd"
				strokeLinejoin="round"
			/>
		</svg>
	)
}
