import { FairyBodySpritePart } from './parts/FairyBodySpritePart'
import { FairyHatSpritePart } from './parts/FairyHatSpritePart'

export function ReviewingSprite1({
	bodyColor,
	hatColor,
	tint,
}: {
	bodyColor: string
	hatColor: string
	tint?: string | null
}) {
	return (
		<WaitingSpriteBase
			bodyColor={bodyColor}
			hatColor={hatColor}
			offsetX={-1.5}
			offsetY={0}
			mouthOffsetX={0}
			mouthOffsetY={0}
			tint={tint}
		/>
	)
}

export function ReviewingSprite2({
	bodyColor,
	hatColor,
	tint,
}: {
	bodyColor: string
	hatColor: string
	tint?: string | null
}) {
	return (
		<WaitingSpriteBase
			bodyColor={bodyColor}
			hatColor={hatColor}
			offsetX={0}
			offsetY={0}
			mouthOffsetX={0}
			mouthOffsetY={0}
			tint={tint}
		/>
	)
}

export function ReviewingSprite3({
	bodyColor,
	hatColor,
	tint,
}: {
	bodyColor: string
	hatColor: string
	tint?: string | null
}) {
	return (
		<WaitingSpriteBase
			bodyColor={bodyColor}
			hatColor={hatColor}
			offsetX={1.5}
			offsetY={0}
			mouthOffsetX={0}
			mouthOffsetY={0}
			tint={tint}
		/>
	)
}

export function NoddingSprite1({
	bodyColor,
	hatColor,
	tint,
}: {
	bodyColor: string
	hatColor: string
	tint?: string | null
}) {
	return (
		<WaitingSpriteBase
			bodyColor={bodyColor}
			hatColor={hatColor}
			offsetX={0}
			offsetY={-1.5}
			mouthOffsetX={0}
			mouthOffsetY={-1.5}
			tint={tint}
		/>
	)
}

export function NoddingSprite2({
	bodyColor,
	hatColor,
	tint,
}: {
	bodyColor: string
	hatColor: string
	tint?: string | null
}) {
	return (
		<WaitingSpriteBase
			bodyColor={bodyColor}
			hatColor={hatColor}
			offsetX={0}
			offsetY={1.5}
			mouthOffsetX={0}
			mouthOffsetY={1.5}
			tint={tint}
		/>
	)
}

export function WaitingSpriteBase({
	bodyColor,
	hatColor,
	offsetX,
	offsetY,
	mouthOffsetX,
	mouthOffsetY,
	tint,
}: {
	bodyColor: string
	hatColor: string
	offsetX: number
	offsetY: number
	mouthOffsetX: number
	mouthOffsetY: number
	tint?: string | null
}) {
	return (
		<>
			<FairyBodySpritePart bodyColor={bodyColor} tint={tint ?? null} />
			<FairyHatSpritePart hatColor={hatColor} offsetX={0} />
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
