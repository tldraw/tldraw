export function SpeechIcon() {
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
			{/* Speech bubble */}
			<path d="M3 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3l-3 3V7a2 2 0 0 1 2-2z" />
			{/* Ellipsis dots */}
			<circle cx="8" cy="11" r="1.5" fill="currentColor" />
			<circle cx="12" cy="11" r="1.5" fill="currentColor" />
			<circle cx="16" cy="11" r="1.5" fill="currentColor" />
		</svg>
	)
}
