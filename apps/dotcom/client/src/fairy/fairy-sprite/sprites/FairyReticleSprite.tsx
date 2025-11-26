export function FairyReticleSprite({
	fairyCount = 1,
	inset: _inset = 1,
}: {
	fairyCount?: number
	inset?: number
}) {
	const strokeWidth = 1
	const inset = _inset + strokeWidth / 2 // Half stroke width for centering
	const cornerLength = 4 // Length of each leg of the L
	const width = 32 // ViewBox width
	const baseHeight = 32 // Base height for single fairy
	const height = baseHeight * fairyCount // Scale height by fairy count

	return (
		<svg
			className="fairy-selected-sprite"
			width="100%"
			height="100%"
			viewBox={`0 0 ${width} ${height}`}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				stroke="var(--tl-color-fairy-select-bg)"
				strokeWidth={strokeWidth * 3}
				strokeLinecap="square"
				strokeLinejoin="round"
				d={`M ${inset} ${inset + cornerLength} L ${inset} ${inset} L ${inset + cornerLength} ${inset} M ${width - inset - cornerLength} ${inset} L ${width - inset} ${inset} L ${width - inset} ${inset + cornerLength} M ${inset} ${height - inset - cornerLength} L ${inset} ${height - inset} L ${inset + cornerLength} ${height - inset} M ${width - inset - cornerLength} ${height - inset} L ${width - inset} ${height - inset} L ${width - inset} ${height - inset - cornerLength}`}
			/>
			<path
				stroke="var(--tl-color-fairy-select-fg)"
				strokeWidth={strokeWidth}
				strokeLinecap="square"
				strokeLinejoin="round"
				d={`M ${inset} ${inset + cornerLength} L ${inset} ${inset} L ${inset + cornerLength} ${inset} M ${width - inset - cornerLength} ${inset} L ${width - inset} ${inset} L ${width - inset} ${inset + cornerLength} M ${inset} ${height - inset - cornerLength} L ${inset} ${height - inset} L ${inset + cornerLength} ${height - inset} M ${width - inset - cornerLength} ${height - inset} L ${width - inset} ${height - inset} L ${width - inset} ${height - inset - cornerLength}`}
			/>
		</svg>
	)
}
