export function FlagIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="chat-icon"
		>
			{/* Flag, shifted right by 2 units */}
			<path d="M6 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
			{/* Pole, shifted right by 2 units */}
			<path d="M6 22l0-16" />
		</svg>
	)
}
