export function FairyBodySpritePart({
	bodyColor,
	tint,
}: {
	bodyColor: string
	tint: string | null
}) {
	return (
		<>
			{/* Left leg */}
			<path
				d="M37.8768 104C37.8768 104 43.698 97.305 45.1534 92.2841C46.6087 87.2632 45.7355 81.4419 45.7355 81.4419"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			{/* Right leg */}
			<path
				d="M55.4159 101.089C55.4159 101.089 59.477 95.6217 60.5071 91.3381C61.5371 87.0545 60.9482 83.3134 60.9482 83.3134"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			{/* Body */}
			<path
				d="M42.8558 78.9622C39.0737 74.3527 39.97 52.878 41.4442 49.1282C44.4666 41.4405 63.6705 45.0422 65.608 52.5445C66.7734 57.0568 67.7949 77.8394 64.958 80.3805C62.121 82.9216 46.6379 83.5718 42.8558 78.9622Z"
				fill={tint ?? bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
		</>
	)
}
