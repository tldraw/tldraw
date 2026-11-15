import {
	CommentBody,
	CommentCardProps,
	CommentThread,
	CommentThreadProps,
	Reactions,
	ReactionSummary,
} from '@tldraw/commenting'
import { ReactNode } from 'react'
import { TldrawUiButton, TldrawUiIcon, TLRichText, toRichText } from 'tldraw'
import {
	ada,
	ago,
	DAY,
	grace,
	HOUR,
	LONG_URL,
	longName,
	MANY_LINES,
	MANY_REACTIONS,
	MASHED,
	ONE_LINE,
	ONE_REACTION,
	reaction,
	RTL,
	SHORT,
	steve,
	THREE_REACTIONS,
	TWO_LINES,
} from './fixtures'

const text = (value: string) => <CommentBody richText={toRichText(value)} />

const p = (...content: object[]) => ({ type: 'paragraph', content })
const t = (value: string, ...marks: string[]) => ({
	type: 'text',
	text: value,
	...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
})
const li = (value: string) => ({ type: 'listItem', content: [p(t(value))] })

// Every kind of formatting the comment extension set allows, in one body.
const FORMATTED_DOC = {
	type: 'doc',
	content: [
		p(
			{ type: 'mention', attrs: { id: 'ada', label: 'Ada Lovelace' } },
			t(' some '),
			t('bold', 'bold'),
			t(', '),
			t('italic', 'italic'),
			t(', '),
			t('code', 'code'),
			t(' and '),
			t('highlighted', 'highlight'),
			t(' text, with '),
			{
				type: 'text',
				text: 'a link',
				marks: [{ type: 'link', attrs: { href: 'https://tldraw.dev' } }],
			},
			t('.')
		),
		{ type: 'bulletList', content: [li('First bullet'), li('Second bullet')] },
		p(t('A paragraph between the lists.')),
		{ type: 'orderedList', content: [li('First step'), li('Second step')] },
	],
} as unknown as TLRichText
const FORMATTED = <CommentBody richText={FORMATTED_DOC} />

// The real thread clamps a long body and adds this toggle (`CollapsibleBody` in thread-view.tsx,
// which isn't exported), so the collapsed state is reproduced with its classes.
const clamped = (
	<>
		<div className="tlui-cmt-collapsible tlui-cmt-collapsible--collapsed">
			{text(`${MANY_LINES}\n${MANY_LINES}\n${MANY_LINES}`)}
		</div>
		<button type="button" className="tlui-cmt-see-more">
			See more
		</button>
	</>
)

const reactions = (summary: ReactionSummary[]) => <Reactions reactions={summary} canReact />

function IconButton({ icon, label }: { icon: string; label: string }) {
	return (
		<TldrawUiButton type="icon" title={label} className="tlui-cmt-icon-btn">
			<TldrawUiIcon icon={icon} label={label} small />
		</TldrawUiButton>
	)
}
const ONE_ACTION = <IconButton icon="dots-vertical" label="More options" />
const TWO_ACTIONS = (
	<>
		<IconButton icon="plus" label="React" />
		<IconButton icon="dots-vertical" label="More options" />
	</>
)
const HEADER_ACTIONS = (
	<>
		<IconButton icon="check" label="Resolve" />
		<IconButton icon="dots-vertical" label="More options" />
	</>
)

function card(
	overrides: Partial<CommentCardProps> & { body: ReactNode | string }
): CommentCardProps {
	const { body, ...rest } = overrides
	return {
		author: steve,
		date: ago(7 * HOUR),
		you: false,
		actions: TWO_ACTIONS,
		...rest,
		body: typeof body === 'string' ? text(body) : body,
	}
}

const composer = { author: steve, placeholder: 'Reply...' }

export const THREADS: { title: string; thread: CommentThreadProps }[] = [
	{
		title: 'Text length',
		thread: {
			header: 'Thread',
			headerActions: HEADER_ACTIONS,
			composer,
			comments: [
				card({ body: SHORT }),
				card({ body: ONE_LINE }),
				card({ body: TWO_LINES }),
				card({ body: MANY_LINES }),
				card({ body: 'First paragraph.\nSecond paragraph.\nThird paragraph.' }),
				card({ body: clamped }),
				card({ body: LONG_URL }),
				card({ body: MASHED }),
				card({ body: '👍' }),
				card({ body: RTL }),
				card({ body: FORMATTED }),
				card({ body: '' }),
			],
		},
	},
	{
		title: 'Names, times and actions',
		thread: {
			header: 'Thread',
			headerActions: HEADER_ACTIONS,
			composer,
			comments: [
				card({ body: ONE_LINE, author: { name: 'Al', color: '#0E9F6E' } }),
				card({ body: ONE_LINE, author: ada, date: ago(10_000) }),
				card({ body: ONE_LINE, author: grace, date: ago(250 * DAY) }),
				card({ body: ONE_LINE, edited: true }),
				card({ body: ONE_LINE, author: ada, date: ago(250 * DAY), edited: true }),
				card({ body: ONE_LINE, author: longName }),
				card({ body: ONE_LINE, author: longName, date: ago(250 * DAY), edited: true }),
				card({ body: ONE_LINE, author: longName, actions: ONE_ACTION }),
				card({ body: ONE_LINE, author: longName, actions: undefined }),
				card({ body: ONE_LINE, actions: ONE_ACTION }),
				card({ body: ONE_LINE, actions: undefined }),
				card({ body: ONE_LINE, author: { name: '' } }),
				card({ body: ONE_LINE, you: true }),
			],
		},
	},
	{
		title: 'Reactions',
		thread: {
			header: 'Thread',
			headerActions: HEADER_ACTIONS,
			composer,
			comments: [
				card({ body: ONE_LINE, footer: reactions(ONE_REACTION) }),
				card({ body: ONE_LINE, footer: reactions([reaction('👍', 1, true)]) }),
				card({ body: ONE_LINE, footer: reactions(THREE_REACTIONS) }),
				card({ body: MANY_LINES, footer: reactions(MANY_REACTIONS) }),
				card({ body: clamped, footer: reactions(THREE_REACTIONS) }),
				card({ body: FORMATTED, footer: reactions(ONE_REACTION) }),
				card({ body: SHORT, footer: reactions(ONE_REACTION) }),
			],
		},
	},
	{
		title: 'One comment',
		thread: {
			header: 'Thread',
			headerActions: HEADER_ACTIONS,
			composer,
			comments: [card({ body: SHORT })],
		},
	},
	{
		title: 'Resolved, no composer',
		thread: {
			header: 'Thread',
			headerActions: HEADER_ACTIONS,
			resolvedBanner: 'Resolved by Ada Lovelace',
			comments: [card({ body: ONE_LINE }), card({ body: TWO_LINES, author: ada })],
		},
	},
	{
		title: 'Resolved, long name',
		thread: {
			header: 'Thread',
			headerActions: HEADER_ACTIONS,
			resolvedBanner: `Resolved by ${longName.name}`,
			comments: [card({ body: ONE_LINE, footer: reactions(THREE_REACTIONS) })],
		},
	},
	{
		title: 'Read only, with footer',
		thread: {
			header: 'Thread',
			headerActions: <IconButton icon="dots-vertical" label="More options" />,
			footer: <span style={{ padding: '0 10px 10px', fontSize: 12 }}>Sign in to reply.</span>,
			comments: [
				card({ body: ONE_LINE, actions: undefined }),
				card({ body: MANY_LINES, author: grace, actions: undefined }),
			],
		},
	},
	{
		title: 'No header',
		thread: {
			composer,
			comments: [card({ body: ONE_LINE }), card({ body: SHORT, author: ada })],
		},
	},
	{
		title: 'Long title',
		thread: {
			header: 'A thread title that is much longer than the panel is wide',
			headerActions: HEADER_ACTIONS,
			composer,
			comments: [card({ body: ONE_LINE })],
		},
	},
]

export function ThreadGallery({ width }: { width: number | null }) {
	return (
		<>
			{/* The thread sets its own 300px width; let the slider's wrapper override it. */}
			<style>{`.cmt-gallery-thread .tlui-cmt-thread { width: 100%; }`}</style>
			{THREADS.map(({ title, thread }) => (
				<div
					key={title}
					className="cmt-gallery-thread"
					style={{ width: width ?? 300, flexShrink: 0 }}
				>
					<div style={{ fontSize: 12, marginBottom: 8, color: 'var(--tl-color-text-3)' }}>
						{title}
					</div>
					<CommentThread {...thread} />
				</div>
			))}
		</>
	)
}
