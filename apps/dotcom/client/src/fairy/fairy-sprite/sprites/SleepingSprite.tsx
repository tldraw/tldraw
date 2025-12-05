import { FairyHatSpritePart } from './parts/FairyHatSpritePart'
import { FairySpriteProps } from './sprite-types'

// Approximate path lengths for sleeping legs (measured from the SVG paths)
const LEFT_LEG_LENGTH = 18
const RIGHT_LEG_LENGTH = 17

export function SleepingSprite(props: FairySpriteProps) {
	const { legLength } = props
	// legLength is 0-1, where 1 is full length
	const scale = 0.5 + legLength * 0.5
	const leftDashOffset = LEFT_LEG_LENGTH * (1 - scale)
	const rightDashOffset = RIGHT_LEG_LENGTH * (1 - scale * 0.96)

	return (
		<>
			<FairyHatSpritePart {...props} offsetX={1} offsetY={3} />
			<path
				d="M65.6146 53.7521C68.8514 55.8325 73.413 60.9857 74.1733 66.8989"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			{/* Left leg - path reversed to grow from body down */}
			<path
				d="M46.5827 85.4702C46.5827 85.4702 46.3766 89.2887 46.7201 92.5821C47.0636 95.8756 48.4376 100.267 48.4376 100.267"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
				strokeDasharray={LEFT_LEG_LENGTH}
				strokeDashoffset={leftDashOffset}
			/>
			{/* Right leg - path reversed to grow from body down */}
			<path
				d="M61.5989 87.3418C61.5989 87.3418 61.7497 90.3046 61.4859 93.6972C61.222 97.0898 60.1818 101.42 60.1818 101.42"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
				strokeDasharray={RIGHT_LEG_LENGTH}
				strokeDashoffset={rightDashOffset}
			/>
			<path
				d="M43.3818 82.9905C39.5997 78.381 40.496 56.9063 41.9702 53.1565C44.9926 45.4689 64.1965 49.0706 66.134 56.5728C67.2994 61.0851 68.3209 81.8677 65.484 84.4088C62.647 86.95 47.1639 87.6001 43.3818 82.9905Z"
				fill={props.tint ?? props.bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			<circle
				cx="55.9419"
				cy="37.8115"
				r="19.8442"
				fill={props.bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			<path
				d="M38.9547 55.5009C38.9547 55.5009 36.4896 59.1794 34.9243 62.6311C33.3591 66.0828 33.2653 68.8938 33.2653 68.8938"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="7"
				strokeLinecap="round"
			/>
			<path
				d="M48.6738 42.3267C48.6738 42.3267 49.8288 43.7894 51.4491 44.1565C53.0694 44.5236 54.4968 43.6459 54.4968 43.6459"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="4"
				strokeLinecap="round"
			/>
			<path
				d="M63.4446 43.7061C63.4446 43.7061 64.933 44.5425 66.5486 44.1429C68.1642 43.7434 69.2506 42.2701 69.2506 42.2701"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="4"
				strokeLinecap="round"
			/>
			<circle cx="59.7095" cy="49.1596" r="1.93228" fill="var(--tl-color-fairy-dark)" />
			<path
				d="M82.0023 11.8623L88.0255 11.1453C88.8429 11.048 89.4212 11.9247 89.01 12.6377L84.8816 19.7979C84.4748 20.5035 85.037 21.3735 85.8474 21.2925L93.4369 20.5335"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinecap="round"
			/>
			<path
				d="M93.437 4.46094L99.4602 3.74389C100.278 3.64659 100.856 4.52329 100.445 5.23638L96.3163 12.3966C95.9095 13.1022 96.4717 13.9721 97.2821 13.8911L104.872 13.1322"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinecap="round"
			/>
		</>
	)
}
