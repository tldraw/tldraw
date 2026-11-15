import { CommentListItemProps, CommentsList } from '@tldraw/commenting'
import { ReactNode, useState } from 'react'
import { TLComponents, Tldraw, useEditor, useValue } from 'tldraw'
import {
	ada,
	ago,
	DAY,
	grace,
	HOUR,
	LONG_URL,
	MANY_LINES,
	MANY_REACTIONS,
	MASHED,
	ONE_LINE,
	reaction,
	RTL,
	SHORT,
	steve,
	TWO_LINES,
} from './fixtures'
import { NotificationGallery } from './NotificationGallery'
import { ThreadGallery } from './ThreadGallery'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'

let nextId = 0
function row(
	overrides: Partial<CommentListItemProps> & Pick<CommentListItemProps, 'preview'>
): CommentListItemProps {
	return { id: `row-${nextId++}`, author: steve, date: ago(7 * HOUR), count: 1, ...overrides }
}

// [1]
const GROUPS: { title: string; items: CommentListItemProps[] }[] = [
	{
		title: 'Text length',
		items: [
			row({ preview: SHORT }),
			row({ preview: ONE_LINE }),
			row({ preview: TWO_LINES }),
			row({ preview: MANY_LINES }),
			row({ preview: LONG_URL }),
			row({ preview: MASHED }),
			row({ preview: '👍' }),
			row({ preview: 'First line\nSecond line\nThird line' }),
			row({ preview: RTL }),
			row({ preview: '' }),
		],
	},
	{
		title: 'Names and times',
		items: [
			row({ preview: ONE_LINE, author: { name: 'Al', color: '#0E9F6E' } }),
			row({ preview: ONE_LINE, author: ada, date: ago(10_000) }),
			row({ preview: ONE_LINE, author: grace, date: ago(5 * 60_000) }),
			row({ preview: ONE_LINE, author: ada, date: ago(3 * DAY) }),
			row({ preview: ONE_LINE, author: grace, date: ago(21 * DAY) }),
			row({ preview: ONE_LINE, author: ada, date: ago(250 * DAY) }),
			row({ preview: ONE_LINE, author: grace, date: ago(800 * DAY) }),
			row({
				preview: ONE_LINE,
				author: { name: 'Wolfeschlegelsteinhausenbergerdorff Hubert Blaine', color: '#9D50FF' },
			}),
			row({
				preview: TWO_LINES,
				author: { name: 'Maria de los Angeles Fernandez-Gutierrez y Villanueva', color: '#9D50FF' },
				date: ago(250 * DAY),
			}),
			row({ preview: ONE_LINE, author: { name: '' } }),
			row({ preview: ONE_LINE, author: { name: 'No color' } }),
			row({
				preview: ONE_LINE,
				author: {
					name: 'With an image',
					image:
						'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 8 8%22%3E%3Crect width=%228%22 height=%228%22 fill=%22%234465E9%22/%3E%3Ccircle cx=%224%22 cy=%224%22 r=%222%22 fill=%22white%22/%3E%3C/svg%3E',
				},
			}),
		],
	},
	{
		title: 'Replies and pages',
		items: [
			row({ preview: ONE_LINE, count: 1 }),
			row({ preview: ONE_LINE, count: 2 }),
			row({ preview: ONE_LINE, count: 3 }),
			row({ preview: ONE_LINE, count: 100 }),
			row({ preview: ONE_LINE, count: 12_346 }),
			row({ preview: ONE_LINE, count: undefined }),
			row({ preview: ONE_LINE, page: 'Page 2' }),
			row({ preview: ONE_LINE, page: 'Page 2', count: 4 }),
			row({
				preview: ONE_LINE,
				page: 'A page with a very long name that someone typed in a hurry',
			}),
			row({
				preview: MANY_LINES,
				page: 'A page with a very long name that someone typed in a hurry',
				count: 100,
			}),
			row({ preview: SHORT, page: '' }),
		],
	},
	{
		title: 'Resolved and selected',
		items: [
			row({ preview: ONE_LINE, selected: true }),
			row({ preview: MANY_LINES, selected: true, count: 3 }),
			row({ preview: ONE_LINE, resolved: true }),
			row({ preview: ONE_LINE, resolved: true, count: 3 }),
			row({ preview: ONE_LINE, resolved: true, page: 'Page 2' }),
			row({ preview: TWO_LINES, resolved: true, page: 'Page 2', count: 3 }),
			row({
				preview: MANY_LINES,
				resolved: true,
				page: 'A page with a very long name that someone typed in a hurry',
				count: 100,
			}),
			row({ preview: ONE_LINE, resolved: true, selected: true, count: 2 }),
			row({ preview: ONE_LINE, href: '#thread' }),
			row({ preview: MANY_LINES, href: '#thread', count: 5, selected: true }),
		],
	},
	{
		title: 'Reactions',
		items: [
			row({ preview: ONE_LINE, reactions: [reaction('👍', 1)] }),
			row({ preview: ONE_LINE, reactions: [reaction('👍', 1, true)] }),
			row({
				preview: ONE_LINE,
				reactions: [reaction('👍', 1), reaction('❤️', 1), reaction('🎉', 1)],
			}),
			row({
				preview: TWO_LINES,
				count: 4,
				reactions: [reaction('👍', 3, true), reaction('❤️', 12)],
			}),
			row({
				preview: ONE_LINE,
				reactions: MANY_REACTIONS,
			}),
			row({
				preview: MANY_LINES,
				resolved: true,
				page: 'Page 2',
				count: 9,
				reactions: [reaction('👍', 2), reaction('🎉', 1, true)],
			}),
			row({ preview: ONE_LINE, reactions: [] }),
		],
	},
	{ title: 'Empty', items: [] },
	{ title: 'One row', items: [row({ preview: SHORT })] },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<>
			<h2 style={{ fontSize: 16, margin: '24px 0 12px' }}>{title}</h2>
			<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 }}>
				{children}
			</div>
		</>
	)
}

function RowGallery() {
	const editor = useEditor()
	// [2]
	const [width, setWidth] = useState<number | null>(null)
	const isDarkMode = useValue('dark mode', () => editor.user.getIsDarkMode(), [editor])
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				overflow: 'auto',
				pointerEvents: 'all',
				padding: 16,
			}}
			// Keep wheel and pointer input in the gallery instead of panning or drawing on the canvas.
			onWheelCapture={(e) => e.stopPropagation()}
			onPointerDown={(e) => e.stopPropagation()}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
				<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					Panel width
					<input
						type="range"
						min={160}
						max={420}
						value={width ?? 280}
						onChange={(e) => setWidth(Number(e.target.value))}
					/>
					{width === null ? 'natural' : `${width}px`}
				</label>
				<button type="button" onClick={() => setWidth(null)} disabled={width === null}>
					Reset
				</button>
				<label style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 16 }}>
					<input
						type="checkbox"
						checked={isDarkMode}
						onChange={(e) =>
							editor.user.updateUserPreferences({
								colorScheme: e.target.checked ? 'dark' : 'light',
							})
						}
					/>
					Dark mode
				</label>
			</div>
			<Section title="Comments list">
				{GROUPS.map((group) => (
					<div
						key={group.title}
						style={{
							width: width ?? 280,
							flexShrink: 0,
							display: 'flex',
							background: 'var(--tl-color-panel)',
							borderRadius: 'var(--tl-radius-4)',
							boxShadow: 'var(--tl-shadow-3)',
							overflow: 'hidden',
						}}
					>
						<CommentsList
							items={group.items}
							header={group.title}
							empty="No comments on this page yet."
						/>
					</div>
				))}
			</Section>
			<Section title="Comment thread">
				<ThreadGallery width={width} />
			</Section>
			<Section title="Notifications list (tldraw.com)">
				<NotificationGallery width={width} />
			</Section>
		</div>
	)
}

const components: TLComponents = { InFrontOfTheCanvas: RowGallery }

export default function CommentListRowsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw hideUi components={components} />
		</div>
	)
}

/*
[1]
Each group is one axis of variation. `CommentsList` and `CommentThread` take summarized items, so
nothing here touches the comment store: a row is whatever its props say it is.

[2]
Each kind of panel starts at its real width (280px for the sidebar, 300px for the thread and the
notifications popover) until the slider overrides it. The panels drop their height caps so every
row is visible at once.
*/
