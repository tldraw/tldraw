export type HatType = 'pointy' | 'antenna' | 'default' | 'fez' | 'traces'

export function FairyHatSpritePart({
	hatColor,
	type = 'default',
	offsetX = 0,
	offsetY = 0,
}: {
	type?: HatType
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
		case 'traces': {
			return (
				<g
					fill={hatColor}
					stroke="var(--tl-color-fairy-dark)"
					strokeWidth="5"
					strokeLinecap="round"
				>
					<circle cx="22.2043" cy="10.9661" r="5.46606" />
					<circle cx="7.96606" cy="7.96606" r="5.46606" transform="matrix(-1 0 0 1 95.7412 3)" />
					<path d="M40.6389 19.7041V11.439H28.307" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M69.3406 19.7041V11.439H81.6725" strokeLinecap="round" strokeLinejoin="round" />
				</g>
			)
		}

		case 'fez': {
			return (
				<g
					fill={hatColor}
					stroke="var(--tl-color-fairy-dark)"
					strokeWidth="5"
					strokeLinecap="round"
				>
					<path d="M47.2383 17.9351L47.6261 5.33154L64.6892 5.47919V17.9351H47.2383Z" />
					<path d="M55.9637 5.33151L55.9637 2.5" />
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
					transform={`translate(${offsetX} ${offsetY})`}
				/>
			)
		}
	}
}
