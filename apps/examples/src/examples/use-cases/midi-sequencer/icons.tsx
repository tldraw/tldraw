// Small inline icons for the Clock, Sequence and Chain shapes. They use
// currentColor so they inherit the surrounding text color.

export function ClockIcon({ size = 18 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
		>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	)
}

export function SequenceIcon({ size = 18 }: { size?: number }) {
	// A few "notes" scattered on a grid, reading as a step/piano-roll pattern.
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
			<rect x="3" y="5" width="7" height="3" rx="1.5" />
			<rect x="12" y="10.5" width="7" height="3" rx="1.5" />
			<rect x="6" y="16" width="7" height="3" rx="1.5" />
		</svg>
	)
}

export function ChainIcon({ size = 18 }: { size?: number }) {
	// Two interlocking links.
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
		>
			<rect x="3" y="8" width="11" height="8" rx="4" />
			<rect x="10" y="8" width="11" height="8" rx="4" />
		</svg>
	)
}
