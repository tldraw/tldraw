import { ReactNode } from 'react'

export type ComposerIconName =
	| 'plus'
	| 'attachment'
	| 'library'
	| 'image'
	| 'web'
	| 'research'
	| 'sketch'
	| 'notion'
	| 'gmail'
	| 'drive'
	| 'microphone'
	| 'voice'
	| 'chevron'
	| 'write'

const paths: Record<ComposerIconName, ReactNode> = {
	plus: <path d="M12 3v18M3 12h18" />,
	attachment: (
		<path d="M8 8v9a4 4 0 0 0 8 0V6a3 3 0 0 0-6 0v11a1 1 0 0 0 2 0V7M6 10v7a6 6 0 0 0 12 0V6" />
	),
	library: (
		<>
			<rect x="2" y="3" width="6" height="18" rx="2" />
			<rect x="8" y="3" width="6" height="18" rx="2" />
			<path d="m15 5 3-1 4 15-4 1z" />
		</>
	),
	image: (
		<>
			<rect x="3" y="3" width="18" height="18" rx="4" />
			<circle cx="15.5" cy="8.5" r="2" />
			<path d="m3 15 5-5 11 11" />
		</>
	),
	web: (
		<>
			<circle cx="12" cy="12" r="10" />
			<ellipse cx="12" cy="12" rx="4" ry="10" />
			<path d="M2 12h20" />
		</>
	),
	research: (
		<>
			<path fill="#559dff" stroke="none" d="m2 10 15-6 3 8-15 6z" />
			<path stroke="#81c5ff" strokeWidth="6" d="m18 4 3 8" />
			<circle cx="12" cy="16" r="2" />
			<path d="m12 18-4 5m4-5 4 5" />
		</>
	),
	sketch: <path d="M2 15C8 9 15 1 17 3c3 3-13 14-9 17 3 2 10-11 12-8 2 2-8 10-4 10 1 0 4-3 6-4" />,
	notion: (
		<>
			<path d="m3 3 14-1 5 4v16L6 23 2 18V4l4 3 16-1M6 7v16" />
			<path d="M9 18V10l8 9V9M8 10h3m4-1h4m-11 9h3" />
		</>
	),
	gmail: (
		<>
			<path stroke="#4285f4" strokeWidth="4" d="M3 9v11" />
			<path stroke="#34a853" strokeWidth="4" d="M21 9v11" />
			<path stroke="#ea4335" strokeWidth="4" d="M3 9V5l9 7 9-7v4" />
			<path stroke="#fbbc04" strokeWidth="4" d="M21 5v4" />
		</>
	),
	drive: (
		<>
			<path fill="#34a853" stroke="none" d="m9 2-9 16h7L16 2z" />
			<path fill="#fbbc04" stroke="none" d="m9 2 9 16h6L16 2z" />
			<path fill="#4285f4" stroke="none" d="m0 18 3 5h18l3-5z" />
		</>
	),
	microphone: (
		<>
			<rect x="8" y="2" width="8" height="14" rx="4" />
			<path d="M4 11v1a8 8 0 0 0 16 0v-1m-8 9v3" />
		</>
	),
	voice: <path d="M4 10v4m5-9v14m5-17v20m5-14v8" />,
	chevron: <path d="m6 9 6 6 6-6" />,
	write: (
		<>
			<path d="m3 16-1 6 6-1L21 8a3 3 0 0 0-5-5zM14 5l5 5" />
		</>
	),
}

export function ComposerIcon({ name }: { name: ComposerIconName }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{paths[name]}
		</svg>
	)
}
