import { FairyHatSpritePart } from './parts/FairyHatSpritePart'

export function SoaringSprite({
	bodyColor,
	hatColor,
	tint,
}: {
	bodyColor: string
	hatColor: string
	tint?: string | null
}) {
	const scale = 108 / 104
	const scaledWidth = 55 * scale
	const translateX = (108 - scaledWidth) / 2

	return (
		<g transform={`translate(${translateX} 0) scale(${scale})`}>
			{/* Left arm */}
			<path
				d="M15.8234 51.5147C10.2422 54.3645 8.0303 59.6239 3.00018 63.3544"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			{/* Right arm */}
			<path
				d="M41.8202 53.6248C45.8567 60.2734 45.2797 67.063 48.2311 72.3828"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			{/* Left leg */}
			<path
				d="M6.43134 96.0098C6.43134 96.0098 11.3683 89.459 13.6983 84.1379C16.0282 78.8167 17.522 72.2881 17.522 72.2881"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			{/* Right leg */}
			<path
				d="M21.4313 100.01C21.4313 100.01 24.5161 94.5867 26.2167 90.1246C27.9172 85.6625 28.9068 81.6182 28.9068 81.6182"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			{/* Body */}
			<path
				d="M11.9707 73.4739C9.65983 67.9773 16.6416 47.6495 19.1237 44.4757C24.2126 37.9689 41.5925 46.8964 41.3106 54.6396C41.1411 59.2969 36.1948 79.5082 32.7511 81.135C29.3074 82.7617 14.2816 78.9704 11.9707 73.4739Z"
				fill={tint ?? bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			{/* Hat */}
			<FairyHatSpritePart hatColor={hatColor} offsetX={-23.57} />
			{/* Head circle */}
			<circle
				cx="31.8472"
				cy="32.7925"
				r="19.8442"
				fill={bodyColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
			/>
			{/* Smile */}
			<path
				d="M26.6703 36.9853C26.6703 36.9853 27.2149 41.2518 32.5033 41.5511C37.7917 41.8504 40.2534 35.7721 40.2534 35.7721"
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			{/* Right eye */}
			<circle
				cx="41.2026"
				cy="26.781"
				r="2.62701"
				transform="rotate(3.23906 41.2026 26.781)"
				fill="var(--tl-color-fairy-dark)"
			/>
			{/* Left eye */}
			<circle
				cx="24.3582"
				cy="29.9366"
				r="2.77454"
				transform="rotate(3.23906 24.3582 29.9366)"
				fill="var(--tl-color-fairy-dark)"
			/>
		</g>
	)
}
