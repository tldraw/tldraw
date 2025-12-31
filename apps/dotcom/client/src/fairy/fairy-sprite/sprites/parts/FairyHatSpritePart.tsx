import { FairySpriteProps } from '../sprite-types'

export function FairyHatSpritePart({
	hatColor,
	hatType = 'default',
	offsetX = 0,
	offsetY = 0,
	rotate = 0,
}: FairySpriteProps & {
	offsetX?: number
	offsetY?: number
	rotate?: number
}) {
	switch (hatType) {
		case 'bald': {
			return null
		}
		case 'round': {
			return (
				<path
					d="M55.6054 2.50239C45.9999 2.65743 29.5367 11.2035 33.6955 23.2593C37.8543 35.315 74.2695 33.2183 76.9068 22.6302C79.5441 12.0421 66.5837 2.32519 55.6054 2.50239Z"
					fill={hatColor}
					stroke="var(--tl-color-fairy-dark)"
					strokeWidth="5"
					strokeLinecap="round"
					strokeLinejoin="round"
					transform={`translate(${offsetX} ${offsetY}) rotate(${rotate}, 53, 22)`}
				/>
			)
		}
		case 'swoop': {
			return (
				<path
					d="M40.1009 23.4599C55.1865 59.2881 80.7427 10.1973 76.5261 10.1973C63.3263 10.1973 56.5878 2.43364 48.3905 3.58831C40.475 4.7033 34.7969 10.8629 40.1009 23.4599Z"
					fill={hatColor}
					stroke="var(--tl-color-fairy-dark)"
					strokeWidth="5"
					strokeLinecap="round"
					strokeLinejoin="round"
					transform={`translate(${offsetX} ${offsetY}) rotate(${rotate}, 53, 22)`}
				/>
			)
		}
		case 'square': {
			return (
				<path
					d="M56.4961 3.51747C50.1553 3.77871 48.6073 3.65213 50.3722 11.6949C52.1372 19.7377 60.0368 20.5131 61.5464 12.6415C63.056 4.76994 62.8369 3.25622 56.4961 3.51747Z"
					fill={hatColor}
					stroke="var(--tl-color-fairy-dark)"
					strokeWidth="5"
					strokeLinecap="round"
					strokeLinejoin="round"
					transform={`translate(${offsetX} ${offsetY}) rotate(${rotate}, 53, 22)`}
				/>
			)
		}
		case 'horn': {
			return (
				<path
					d="M31.842 8.67113C34.9097 4.94612 48.9333 18.7506 48.9333 18.7506L43.2362 30.802C43.2362 30.802 28.7743 12.3961 31.842 8.67113Z"
					fill={hatColor}
					stroke="var(--tl-color-fairy-dark)"
					strokeWidth="5"
					strokeLinecap="round"
					strokeLinejoin="round"
					transform={`translate(${offsetX} ${offsetY}) rotate(${rotate}, 53, 22)`}
				/>
			)
		}
		case 'flaps': {
			return (
				<g
					fill={hatColor}
					stroke="var(--tl-color-fairy-dark)"
					strokeWidth="5"
					strokeLinecap="round"
					strokeLinejoin="round"
					transform={`translate(${offsetX} ${offsetY}) rotate(${rotate}, 53, 22)`}
				>
					<path d="M26.2091 23.8994C26.6818 14.6049 43.98 20.6773 43.98 20.6773L38.2829 32.7287C38.2829 32.7287 25.7365 33.1939 26.2091 23.8994Z" />
					<path d="M84.2362 24.024C82.9759 13.6267 62.9306 21.7472 62.9306 21.7472L68.6277 33.7987C68.6277 33.7987 85.4964 34.4214 84.2362 24.024Z" />
				</g>
			)
		}
		default: {
			return (
				<path
					d="M69.2398 16.368C59.9878 22.7895 53.7046 23.7996 37.8807 20.7752C41.9489 10.6047 53.984 3.48535 57.0352 3.48535C60.0863 3.48535 65.5106 9.58766 69.2398 16.368Z"
					fill={hatColor}
					stroke="var(--tl-color-fairy-dark)"
					strokeWidth="5"
					strokeLinejoin="round"
					transform={`translate(${offsetX} ${offsetY}) rotate(${rotate}, 53, 22)`}
				/>
			)
		}
	}
}
