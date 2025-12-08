import { FairyBodySpritePart } from './parts/FairyBodySpritePart'
import { FairyHatSpritePart } from './parts/FairyHatSpritePart'
import { FairyLegsSpritePart } from './parts/FairyLegsSpritePart'
import { FairySpriteProps } from './sprite-types'

export function PanickingSprite1(props: FairySpriteProps) {
	return (
		<>
			<PanickingSpriteBase {...props} />
			{/* Panicking arms */}
			<path
				d="M38.6163 53.9999C36.0284 51.6289 17.5418 48.5413 24.9514 27.1064"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			<path
				d="M66.7871 55.623C69.8536 54.6142 89.8682 53.0571 84.3637 28.5664"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			<Face offsetX={-1} />
		</>
	)
}

export function PanickingSprite2(props: FairySpriteProps) {
	return (
		<>
			<PanickingSpriteBase {...props} />
			{/* Panicking arms */}
			<path
				d="M38.6163 53.9073C34.1222 53.3389 21.655 53.6289 19.0456 30.144"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			<path
				d="M66.7871 56.1273C70.6542 56.2383 87.1805 54.4987 90.6597 30.144"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			<Face offsetX={1} />
		</>
	)
}

function PanickingSpriteBase(props: FairySpriteProps) {
	return (
		<>
			<FairyHatSpritePart {...props} />
			<FairyLegsSpritePart {...props} />
			<FairyBodySpritePart {...props} />
			<circle
				cx="55.4159"
				cy="33.7832"
				r="19.8442"
				fill={props.bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
		</>
	)
}

function Face({ offsetX = 0, offsetY = 0 }: { offsetX?: number; offsetY?: number }) {
	return (
		<g transform={`translate(${offsetX} ${offsetY})`}>
			<circle cx="62.2173" cy="26.5916" r="2.62701" fill="var(--tl-color-fairy-dark)" />
			<path
				d="M49.5402 28.7231C49.4536 30.253 48.1432 31.423 46.6133 31.3365C45.0834 31.2499 43.9134 29.9395 43.9999 28.4096C44.0865 26.8797 45.3969 25.7097 46.9268 25.7963C48.4567 25.8828 49.6267 27.1932 49.5402 28.7231Z"
				fill="var(--tl-color-fairy-dark)"
			/>
			<path
				d="M48.4282 37.9515C50.0462 28.6883 61.5394 30.9163 60.312 39.1831L48.4282 37.9515Z"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</g>
	)
}
