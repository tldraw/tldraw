import { FairyHatSpritePart } from './parts/FairyHatSpritePart'
import { FairySpriteProps } from './sprite-types'

const LEFT_LEG_LENGTH = 26
const RIGHT_LEG_LENGTH = 21

export function SoaringSprite(props: FairySpriteProps) {
	const { bodyColor, tint, legLength } = props

	const legScale = 0.5 + legLength * 0.5
	// Negative offset because paths are drawn from foot to body (opposite of FairyLegsSpritePart)
	const leftDashOffset = -LEFT_LEG_LENGTH * (1 - legScale)
	const rightDashOffset = -RIGHT_LEG_LENGTH * (1 - legScale)

	return (
		<g transform="translate(1 0)">
			{/* Left arm */}
			<path
				d="M41.87430 53.49603C36.07844 56.45544 33.78147 61.91713 28.55788 65.79111"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6.23077"
				strokeLinecap="round"
			/>
			{/* Right arm */}
			<path
				d="M68.87098 55.68729C73.06273 62.59161 72.46353 69.64235 75.52845 75.16675"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6.23077"
				strokeLinecap="round"
			/>
			{/* Left leg */}
			<path
				d="M32.12101 99.70248C32.12101 99.70248 37.24785 92.89973 39.66747 87.37397 42.08698 81.84811 43.63823 75.06841 43.63823 75.06841"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6.23077"
				strokeLinecap="round"
				strokeDasharray={LEFT_LEG_LENGTH}
				strokeDashoffset={leftDashOffset}
			/>
			{/* Right leg */}
			<path
				d="M47.69789 103.85654C47.69789 103.85654 50.90133 98.22465 52.66734 93.59093 54.43325 88.95721 55.46091 84.75736 55.46091 84.75736"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6.23077"
				strokeLinecap="round"
				strokeDasharray={RIGHT_LEG_LENGTH}
				strokeDashoffset={rightDashOffset}
			/>
			{/* Body */}
			<path
				d="M37.87342 76.29982C35.47367 70.59181 42.72397 49.48217 45.30153 46.18630 50.58616 39.42924 68.63452 48.70011 68.34178 56.74112 68.16576 61.57755 63.02922 82.56621 59.45307 84.25558 55.87692 85.94484 40.27320 82.00772 37.87342 76.29982Z"
				fill={tint ?? bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5.19231"
			/>
			{/* Hat */}
			<FairyHatSpritePart {...props} offsetX={2} offsetY={2} rotate={-10} />
			{/* Head circle */}
			<circle
				cx="58.51440"
				cy="34.05375"
				r="20.60744"
				fill={bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5.19231"
			/>
			{/* Smile */}
			<path
				d="M53.13839 38.40781C53.13839 38.40781 53.70393 42.83841 59.19573 43.14922 64.68753 43.46003 67.24392 37.14795 67.24392 37.14795"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6.23077"
				strokeLinecap="round"
			/>
			{/* Right eye */}
			<circle
				cx="68.22962"
				cy="27.81104"
				r="2.72805"
				transform="rotate(3.23906 68.22962 27.81104)"
				fill="var(--tl-color-fairy-dark)"
			/>
			{/* Left eye */}
			<circle
				cx="50.73736"
				cy="31.08801"
				r="2.88125"
				transform="rotate(3.23906 50.73736 31.08801)"
				fill="var(--tl-color-fairy-dark)"
			/>
		</g>
	)
}
