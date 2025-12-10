import { FairyBodySpritePart } from './parts/FairyBodySpritePart'
import { FairyHatSpritePart } from './parts/FairyHatSpritePart'
import { FairyLegsSpritePart } from './parts/FairyLegsSpritePart'
import { FairySpriteProps } from './sprite-types'

export function WritingSprite1(props: FairySpriteProps) {
	return <BaseWritingSprite {...props} heading={0} />
}

export function WritingSprite2(props: FairySpriteProps) {
	return <BaseWritingSprite {...props} heading={10} />
}

export function BaseWritingSprite(props: { heading: number } & FairySpriteProps) {
	return (
		<>
			<path
				d="M65.0887 51.5848C65.0887 51.5848 67.5893 56.2864 71.3943 58.8616C75.1993 61.4369 80.601 60.6345 80.601 60.6345"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			<FairyLegsSpritePart {...props} />
			<FairyBodySpritePart {...props} />
			<FairyHatSpritePart {...props} offsetX={3} offsetY={2} />
			<circle
				cx="58.2658"
				cy="36.4192"
				r="19.8442"
				fill={props.bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			<circle
				cx="69.216"
				cy="34.9451"
				r="2.62701"
				transform="rotate(3.23906 69.216 34.9451)"
				fill="var(--tl-color-fairy-dark)"
			/>
			<circle
				cx="56.4075"
				cy="36.2562"
				r="2.77454"
				transform="rotate(3.23906 56.4075 36.2562)"
				fill="var(--tl-color-fairy-dark)"
			/>
			<path
				d="M49.534 71.7667L62.8736 35.9497C63.0491 35.4786 63.5469 35.211 64.0366 35.3246L85.7393 40.3574C86.3687 40.5034 86.6965 41.1988 86.4086 41.7772L82.0187 50.5956C81.9835 50.6664 81.9399 50.7328 81.889 50.7934L80.2836 52.7034C80.1517 52.8603 80.0712 53.0539 80.053 53.258L79.8992 54.9837C79.889 55.0977 79.8594 55.2091 79.8115 55.3131L70.958 74.5413C70.7792 74.9297 70.3731 75.1615 69.9477 75.1178L50.3691 73.1105C49.7181 73.0437 49.3056 72.3799 49.534 71.7667Z"
				fill={props.bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinecap="round"
			/>
			<path
				d="M39.4108 55.2593C39.4108 55.2593 40.5712 59.8951 46.027 59.8951C51.4828 59.8951 54.9901 51.5817 54.9901 51.5817"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="7"
				strokeLinecap="round"
			/>
			<path
				d="M47.0319 42.5432L56.5813 51.2944"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinecap="round"
				transform={`rotate(${props.heading} 56 51) translate(0, 0)`}
			/>
		</>
	)
}
