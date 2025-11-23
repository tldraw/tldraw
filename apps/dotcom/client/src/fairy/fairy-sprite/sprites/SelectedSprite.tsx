export function SelectedSprite() {
	const strokeWidth = 1
	const inset = 1 + strokeWidth / 2 // Half stroke width for centering
	const cornerLength = 4 // Length of each leg of the L
	const size = 32 // ViewBox size

	return (
		<svg
			className="fairy-selected-sprite"
			width="100%"
			height="100%"
			viewBox={`0 0 ${size} ${size}`}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				stroke="hsl(214, 79.40%, 40.00%)"
				strokeWidth={strokeWidth * 3}
				strokeLinecap="square"
				strokeLinejoin="round"
				d={`M ${inset} ${inset + cornerLength} L ${inset} ${inset} L ${inset + cornerLength} ${inset} M ${size - inset - cornerLength} ${inset} L ${size - inset} ${inset} L ${size - inset} ${inset + cornerLength} M ${inset} ${size - inset - cornerLength} L ${inset} ${size - inset} L ${inset + cornerLength} ${size - inset} M ${size - inset - cornerLength} ${size - inset} L ${size - inset} ${size - inset} L ${size - inset} ${size - inset - cornerLength}`}
			/>
			<path
				stroke="hsl(214, 90.60%, 66.70%)"
				strokeWidth={strokeWidth}
				strokeLinecap="square"
				strokeLinejoin="round"
				d={`M ${inset} ${inset + cornerLength} L ${inset} ${inset} L ${inset + cornerLength} ${inset} M ${size - inset - cornerLength} ${inset} L ${size - inset} ${inset} L ${size - inset} ${inset + cornerLength} M ${inset} ${size - inset - cornerLength} L ${inset} ${size - inset} L ${inset + cornerLength} ${size - inset} M ${size - inset - cornerLength} ${size - inset} L ${size - inset} ${size - inset} L ${size - inset} ${size - inset - cornerLength}`}
			/>
		</svg>
	)
}
