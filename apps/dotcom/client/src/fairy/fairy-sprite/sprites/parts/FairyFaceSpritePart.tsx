import { FairySpriteProps } from '../sprite-types'

export function FairyFaceSpritePart({ bodyColor }: FairySpriteProps) {
	return (
		<>
			{/* Head circle */}
			<circle
				cx="55.4159"
				cy="33.7832"
				r="19.8442"
				fill={bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			{/* Smile */}
			<path
				d="M51.0768 38.1579C51.0768 38.1579 51.5588 43.5307 56.8472 43.83C62.1356 44.1292 64.6892 36.4271 64.6892 36.4271"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			{/* Right eye */}
			<circle
				cx="65.7018"
				cy="28.0308"
				r="2.62701"
				transform="rotate(3.23906 65.7018 28.0308)"
				fill="var(--tl-color-fairy-dark)"
			/>
			{/* Left eye */}
			<circle
				cx="47.9069"
				cy="30.8536"
				r="2.77454"
				transform="rotate(3.23906 47.9069 30.8536)"
				fill="var(--tl-color-fairy-dark)"
			/>
		</>
	)
}
