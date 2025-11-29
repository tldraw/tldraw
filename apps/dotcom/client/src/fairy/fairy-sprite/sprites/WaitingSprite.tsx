import { FairyBodySpritePart } from './parts/FairyBodySpritePart'
import { FairyHatSpritePart } from './parts/FairyHatSpritePart'

export function WaitingSprite({
	bodyColor = 'var(--tl-color-fairy-light)',
	hatColor = 'white',
}: {
	bodyColor?: string
	hatColor?: string
}) {
	return (
		<>
			<FairyBodySpritePart bodyColor={bodyColor} />
			{/* Head circle */}
			<circle
				cx="55.4159"
				cy="33.7832"
				r="19.8442"
				fill={bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			{/* Right eye */}
			<circle
				cx="64.6328"
				cy="29.0855"
				r="2.62701"
				transform="rotate(3.23906 64.6328 29.0855)"
				fill="var(--tl-color-fairy-dark)"
			/>
			{/* Left eye */}
			<path
				d="M51.9556 31.2173C51.869 32.7472 50.5586 33.9172 49.0287 33.8306C47.4988 33.744 46.3288 32.4336 46.4154 30.9037C46.502 29.3738 47.8124 28.2038 49.3423 28.2904C50.8721 28.377 52.0422 29.6874 51.9556 31.2173Z"
				fill="var(--tl-color-fairy-dark)"
			/>
			{/* Mouth */}
			<path
				d="M47.6357 39.7195L67.0575 38.0132"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinecap="round"
			/>
			<FairyHatSpritePart hatColor={hatColor} />
			{/* Left arm */}
			<path
				d="M39.694 52.4638C37.1062 50.0928 17.443 56.9522 38.2828 63.2828"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			{/* Right arm */}
			<path
				d="M67.1341 52.6208C69.9352 51.6616 88.5618 55.5505 67.9181 64.8509"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
		</>
	)
}
