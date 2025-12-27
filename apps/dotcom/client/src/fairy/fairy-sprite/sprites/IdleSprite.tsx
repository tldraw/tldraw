import { FairyBodySpritePart } from './parts/FairyBodySpritePart'
import { FairyHatSpritePart } from './parts/FairyHatSpritePart'
import { FairyLegsSpritePart } from './parts/FairyLegsSpritePart'
import { FairySpriteProps } from './sprite-types'

export function IdleSprite(props: FairySpriteProps) {
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
			<path
				d="M51.0768 38.1579C51.0768 38.1579 51.5588 43.5307 56.8472 43.83C62.1356 44.1292 64.6892 36.4271 64.6892 36.4271"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			<circle cx="65.7018" cy="28.0308" r="2.62701" fill="var(--tl-color-fairy-dark)" />
			<circle cx="47.9069" cy="30.8536" r="2.77454" fill="var(--tl-color-fairy-dark)" />
			<path
				d="M65.7866 55.6543C65.7866 55.6543 70.9774 56.8435 75.4154 55.6543C79.8534 54.4652 82.7844 49.8574 82.7844 49.8574"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			<path
				d="M41.5706 55.5088C41.5706 55.5088 36.3798 54.3196 31.9418 55.5088C27.5038 56.6979 24.5727 61.3057 24.5727 61.3057"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
		</>
	)
}
