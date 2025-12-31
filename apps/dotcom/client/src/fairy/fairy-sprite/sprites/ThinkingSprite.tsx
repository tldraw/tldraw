import { FairyBodySpritePart } from './parts/FairyBodySpritePart'
import { FairyHatSpritePart } from './parts/FairyHatSpritePart'
import { FairyLegsSpritePart } from './parts/FairyLegsSpritePart'
import { FairySpriteProps } from './sprite-types'

export function ThinkingSprite(props: FairySpriteProps) {
	return (
		<>
			<path
				d="M65.3304 52.4409C65.3304 52.4409 66.1522 55.8524 69.3809 58.9177C72.6095 61.9829 75.8969 63.5156 75.8969 63.5156"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			<FairyLegsSpritePart {...props} />
			<FairyBodySpritePart {...props} />
			<FairyHatSpritePart {...props} offsetX={0} offsetY={1} />
			<circle
				cx="55.4159"
				cy="33.7832"
				r="19.8442"
				fill={props.bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			<circle cx="62.3212" cy="26.9563" r="3.00928" fill="var(--tl-color-fairy-dark)" />
			<circle cx="47.7234" cy="31.3422" r="3.21667" fill="var(--tl-color-fairy-dark)" />
			<path
				d="M62.8797 39.2658C60.5706 39.5658 52.801 40.5877 52.801 40.755C52.801 40.9249 60.8154 40.5158 62.9839 40.402C63.287 40.386 63.5194 40.1358 63.5194 39.8323C63.5194 39.488 63.2212 39.2215 62.8797 39.2658Z"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			<path
				d="M40.2369 55.8456C40.2369 55.8456 45.1356 61.9368 51.2585 58.9843C57.3813 56.0319 54.9321 47.7251 54.9321 47.7251"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="7"
				strokeLinecap="round"
			/>
		</>
	)
}
