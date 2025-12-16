import { FairyBodySpritePart } from './parts/FairyBodySpritePart'
import { FairyHatSpritePart } from './parts/FairyHatSpritePart'
import { FairyLegsSpritePart } from './parts/FairyLegsSpritePart'
import { FairySpriteProps } from './sprite-types'

export function ReadingSprite1(props: FairySpriteProps) {
	return <BaseReadingSprite {...props} eyeOffsetX={0} />
}

export function ReadingSprite2(props: FairySpriteProps) {
	return <BaseReadingSprite {...props} eyeOffsetX={1} />
}

export function ReadingSprite3(props: FairySpriteProps) {
	return <BaseReadingSprite {...props} eyeOffsetX={2} />
}

function BaseReadingSprite({
	eyeOffsetX = 0,
	...props
}: FairySpriteProps & {
	eyeOffsetX?: number
}) {
	return (
		<>
			<FairyHatSpritePart {...props} />
			<FairyLegsSpritePart {...props} />
			<FairyBodySpritePart {...props} />
			<circle
				cx="55.4159"
				cy="33.7834"
				r="19.8442"
				fill={props.bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			<circle
				cx="66.366"
				cy="32.3093"
				r="2.62701"
				transform={`translate(${eyeOffsetX} 0)`}
				fill="var(--tl-color-fairy-dark)"
			/>
			<circle
				cx="49.7496"
				cy="33.7665"
				r="2.77454"
				transform={`translate(${eyeOffsetX} 0)`}
				fill="var(--tl-color-fairy-dark)"
			/>
			<path
				d="M50.6168 41.4292C50.6168 41.4292 54.9124 41.9709 59.3826 41.9709C63.8527 41.9709 67.5882 41.4293 67.5882 41.4293"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			<path
				d="M54.0719 72.7172L58.8616 34.6991C58.9277 34.1749 59.3901 33.7925 59.9173 33.8261L82.5992 35.2707C83.2068 35.3094 83.6391 35.8773 83.5145 36.4732L81.7658 44.8397C81.7479 44.9252 81.7189 45.008 81.6795 45.086L80.5601 47.3019C80.4677 47.4848 80.4337 47.6917 80.4628 47.8946L80.7081 49.6066C80.7246 49.7219 80.7208 49.8391 80.697 49.953L75.87 73.0467C75.7732 73.5102 75.3646 73.8421 74.8912 73.8421L55.0641 73.8422C54.4622 73.8422 53.9967 73.3143 54.0719 72.7172Z"
				fill={props.bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinecap="round"
			/>
			<path
				d="M38.4022 56.4584C38.4022 56.4584 41.8394 60.5329 46.1228 62.2121C50.4063 63.8914 55.5653 61.8737 55.5653 61.8737"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="7"
				strokeLinecap="round"
			/>
		</>
	)
}
