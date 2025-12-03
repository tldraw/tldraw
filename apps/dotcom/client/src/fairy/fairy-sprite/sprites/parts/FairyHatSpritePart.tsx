export type HatType =
	| 'top'
	| 'pointy'
	| 'bald'
	| 'antenna'
	| 'spiky'
	| 'hair'
	| 'ears'
	| 'propellor'

export function FairyHatSpritePart({
	hatColor,
	type,
	offsetX = 0,
	offsetY = 0,
}: {
	type: HatType
	hatColor: string
	offsetX?: number
	offsetY?: number
}) {
	switch (type) {
		case 'antenna': {
			return (
				<g
					fill={hatColor}
					stroke="var(--tl-color-fairy-dark)"
					strokeWidth="5"
					strokeLinecap="round"
				>
					<path d="M66.7258 16.2819C68.3354 11.2498 70.5428 7.47673 76.1709 5.04461" />
					<path d="M43.5103 17.4528C41.9839 12.6394 39.8907 9.03043 34.5537 6.70404" />
				</g>
			)
		}
		case 'pointy': {
			return (
				<path
					d="M54.7359 2.85303L43.3364 20.9296C52.0421 26.9472 57.1655 27.2676 66.7871 21.581L54.7359 2.85303Z"
					fill={hatColor}
					stroke="var(--tl-color-fairy-dark)"
					strokeWidth="5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
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
					transform={`translate(${offsetX} ${offsetY})`}
				/>
			)
		}
	}
}
