import { ReactNode } from 'react'

export type ComposerIconName =
	| 'download'
	| 'comment'
	| 'remove-background'
	| 'erase'
	| 'resize'
	| 'plus'
	| 'sketch'
	| 'microphone'
	| 'voice'
	| 'chevron'
	| 'copy'
	| 'feedback'
	| 'share'
	| 'retry'
	| 'more'

const paths: Record<ComposerIconName, ReactNode> = {
	download: <path d="M12 3v12m-5-5 5 5 5-5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />,
	comment: (
		<>
			<path d="M21 11a9 9 0 1 0-5 8l5 2-1-6a9 9 0 0 0 1-4Z" />
			<path d="M8 11h8m-4-4v8" />
		</>
	),
	'remove-background': (
		<>
			<rect x="3" y="3" width="18" height="18" rx="3" />
			<path d="m3 10 7-7m-7 14 14-14m-10 18 14-14m-7 14 7-7" />
			<ellipse cx="12" cy="12" rx="4" ry="6" fill="var(--chat-panel)" />
		</>
	),
	erase: <path d="m4 12 8-8a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-8 8H8l-4-4a3 3 0 0 1 0-4Zm3-3 9 9" />,
	resize: (
		<>
			<rect x="5" y="7" width="12" height="12" rx="2" />
			<path d="M16 3h5v5M8 23H3v-5" />
		</>
	),

	copy: (
		<>
			<rect x="3" y="8" width="13" height="14" rx="3" />
			<path d="M8 8V5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-3" />
		</>
	),
	feedback: (
		<>
			<path d="M3 8h3v8H3zM6 15h6l2-7h-4l1-5-2-1-3 6M21 16h-3V8h3zM18 9h-3m3 7-3 6-2-1 1-5h-3" />
		</>
	),
	share: <path d="M12 16V3m-5 5 5-5 5 5M4 13v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />,
	retry: (
		<>
			<path d="M20 3v6h-6M4 21v-6h6M20 9a8 8 0 0 0-14-4M4 15a8 8 0 0 0 14 4" />
		</>
	),
	more: (
		<>
			<circle cx="4" cy="12" r="1" fill="currentColor" />
			<circle cx="12" cy="12" r="1" fill="currentColor" />
			<circle cx="20" cy="12" r="1" fill="currentColor" />
		</>
	),
	plus: <path d="M12 3v18M3 12h18" />,
	sketch: <path d="M2 15C8 9 15 1 17 3c3 3-13 14-9 17 3 2 10-11 12-8 2 2-8 10-4 10 1 0 4-3 6-4" />,
	microphone: (
		<>
			<rect x="8" y="2" width="8" height="14" rx="4" />
			<path d="M4 11v1a8 8 0 0 0 16 0v-1m-8 9v3" />
		</>
	),
	voice: <path d="M4 10v4m5-9v14m5-17v20m5-14v8" />,
	chevron: <path d="m6 9 6 6 6-6" />,
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
