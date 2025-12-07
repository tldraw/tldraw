import { FairyBodySpritePart } from './parts/FairyBodySpritePart'
import { FairyHatSpritePart } from './parts/FairyHatSpritePart'
import { FairyLegsSpritePart } from './parts/FairyLegsSpritePart'
import { FairySpriteProps } from './sprite-types'

export function ReviewingSprite1(props: FairySpriteProps) {
	return (
		<WaitingSpriteBase offsetX={-1.5} offsetY={0} mouthOffsetX={0} mouthOffsetY={0} {...props} />
	)
}

export function ReviewingSprite2(props: FairySpriteProps) {
	return <WaitingSpriteBase offsetX={0} offsetY={0} mouthOffsetX={0} mouthOffsetY={0} {...props} />
}

export function ReviewingSprite3(props: FairySpriteProps) {
	return (
		<WaitingSpriteBase offsetX={1.5} offsetY={0} mouthOffsetX={0} mouthOffsetY={0} {...props} />
	)
}

export function NoddingSprite1(props: FairySpriteProps) {
	return (
		<WaitingSpriteBase offsetX={0} offsetY={-1.5} mouthOffsetX={0} mouthOffsetY={-1.5} {...props} />
	)
}

export function NoddingSprite2(props: FairySpriteProps) {
	return (
		<WaitingSpriteBase offsetX={0} offsetY={1.5} mouthOffsetX={0} mouthOffsetY={1.5} {...props} />
	)
}

export function WaitingSpriteBase({
	offsetX,
	offsetY,
	mouthOffsetX,
	mouthOffsetY,
	...props
}: FairySpriteProps & {
	offsetX: number
	offsetY: number
	mouthOffsetX: number
	mouthOffsetY: number
}) {
	return (
		<>
			<FairyLegsSpritePart {...props} />
			<FairyBodySpritePart {...props} />
			<FairyHatSpritePart {...props} offsetX={0} />
			{/* Head circle */}
			<circle
				cx="55.4159"
				cy="33.7832"
				r="19.8442"
				fill={props.bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			{/* Right eye */}
			<circle
				cx="64.6328"
				cy="29.0854"
				r="2.62695"
				fill="var(--tl-color-fairy-dark)"
				transform={`translate(${offsetX} ${offsetY})`}
			/>
			<circle
				cx="49.1851"
				cy="31.0611"
				r="2.775"
				fill="var(--tl-color-fairy-dark)"
				transform={`translate(${offsetX} ${offsetY})`}
			/>
			{/* Mouth */}
			<path
				d="M47.6357 39.7195C55.2237 40.0852 59.4751 39.7527 67.0575 38.0132"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinecap="round"
				transform={`translate(${mouthOffsetX} ${mouthOffsetY})`}
			/>
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
