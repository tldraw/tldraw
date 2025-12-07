import { FairyBodySpritePart } from './parts/FairyBodySpritePart'
import { FairyHatSpritePart } from './parts/FairyHatSpritePart'
import { FairyLegsSpritePart } from './parts/FairyLegsSpritePart'
import { FairySpriteProps } from './sprite-types'

export function WorkingSprite1(props: FairySpriteProps) {
	return (
		<>
			<g stroke="var(--tl-color-fairy-dark)" strokeLinecap="round">
				<path
					d="M65.5907 53.3966C65.5907 53.3966 70.0926 55.3493 74.3761 55.1193C78.6596 54.8892 82.6283 51.7969 82.6283 51.7969"
					strokeWidth="6"
				/>
				<WorkingSpriteBase {...props} />
				<path
					d="M41.1356 56.2007C41.1356 56.2007 42.2812 64.0008 46.9921 69.0741C51.703 74.1473 58.4068 73.4227 58.4068 73.4227"
					strokeWidth="7"
				/>
			</g>
		</>
	)
}

export function WorkingSprite2(props: FairySpriteProps) {
	return (
		<>
			<g stroke="var(--tl-color-fairy-dark)" strokeLinecap="round">
				<path
					d="M65.2349 54.2168C65.2349 54.2168 66.9787 58.8999 71.7576 61.4642C76.5365 64.0285 81.5417 59.4712 81.5417 59.4712"
					strokeWidth="6"
				/>
				<WorkingSpriteBase {...props} />
				<path
					d="M41.5676 58.9449C41.5676 58.9449 40.9778 63.7401 46.5726 66.5375C52.1674 69.3348 59.0745 64.9068 59.0745 64.9068"
					strokeWidth="7"
				/>
			</g>
		</>
	)
}

export function WorkingSprite3(props: FairySpriteProps) {
	return (
		<>
			<g stroke="var(--tl-color-fairy-dark)" strokeLinecap="round">
				<path
					d="M65.8094 54.2964C65.8094 54.2964 66.6273 59.29 71.3381 62.9137C76.049 66.5375 80.3975 67.081 80.3975 67.081"
					strokeWidth="6"
				/>
				<WorkingSpriteBase {...props} />
				<path
					d="M41.7315 58.8285C41.7315 58.8285 43.114 64.9512 49.2333 66.1751C55.3526 67.399 57.9302 61.1019 57.9302 61.1019"
					strokeWidth="7"
				/>
			</g>
		</>
	)
}

export function WorkingSpriteBase(props: FairySpriteProps) {
	return (
		<>
			<FairyLegsSpritePart {...props} />
			<FairyBodySpritePart {...props} />
			<FairyHatSpritePart {...props} />
			{/* Head */}
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
				cx="68.6311"
				cy="32.294"
				r="2.62701"
				transform="rotate(3.23906 68.6311 32.294)"
				fill="var(--tl-color-fairy-dark)"
			/>
			{/* Left eye */}
			<circle
				cx="50.8361"
				cy="35.1168"
				r="2.77454"
				transform="rotate(3.23906 50.8361 35.1168)"
				fill="var(--tl-color-fairy-dark)"
			/>
			{/* Mouth */}
			<path
				d="M54.6211 43.9913C54.6211 43.9913 60.8177 43.9913 63.8067 42.2415"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinecap="round"
			/>
		</>
	)
}
