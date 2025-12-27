import { FairySpriteProps } from '../sprite-types'

export function FairyBodySpritePart({ bodyColor, tint }: FairySpriteProps) {
	return (
		<>
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
