export function FairyHatSpritePart({
	hatColor,
	offsetX = 0,
	offsetY = 0,
}: {
	hatColor: string
	offsetX?: number
	offsetY?: number
}) {
	return (
		<>
			<path
				d="M69.2398 16.368C59.9878 22.7895 53.7046 23.7996 37.8807 20.7752C41.9489 10.6047 53.984 3.48535 57.0352 3.48535C60.0863 3.48535 65.5106 9.58766 69.2398 16.368Z"
				fill={hatColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinejoin="round"
				transform={`translate(${offsetX} ${offsetY})`}
			/>
		</>
	)
}
