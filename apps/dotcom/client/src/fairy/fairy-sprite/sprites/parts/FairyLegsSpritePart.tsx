import { FairySpriteProps } from '../sprite-types'

// Approximate path lengths (measured from the SVG paths)
const LEFT_LEG_LENGTH = 26
const RIGHT_LEG_LENGTH = 21

export function FairyLegsSpritePart({ legLength }: FairySpriteProps) {
	// legLength is 0-1, where 1 is full length
	const scale = 0.5 + legLength * 0.5
	const leftDashOffset = LEFT_LEG_LENGTH * (1 - scale)
	const rightDashOffset = RIGHT_LEG_LENGTH * (1 - scale * 0.96)

	return (
		<g className="fairy-legs-sprite-part">
			{/* Left leg - path reversed to grow from body down */}
			<path
				d="M45.7355 81.4419C45.7355 81.4419 46.6087 87.2632 45.1534 92.2841C43.698 97.305 37.8768 104 37.8768 104"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
				strokeDasharray={LEFT_LEG_LENGTH}
				strokeDashoffset={leftDashOffset}
			/>
			{/* Right leg - path reversed to grow from body down */}
			<path
				d="M60.9482 83.3134C60.9482 83.3134 61.5371 87.0545 60.5071 91.3381C59.477 95.6217 55.4159 101.089 55.4159 101.089"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
				strokeDasharray={RIGHT_LEG_LENGTH}
				strokeDashoffset={rightDashOffset}
			/>
		</g>
	)
}
