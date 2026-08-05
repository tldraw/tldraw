import {
	CanvasComments,
	CommentAuthor,
	CommentTool,
	commentToolOverrides,
	filterMentionMembers,
	MentionMember,
	putCommentRecords,
} from '@tldraw/commenting'
import { getLicenseKey } from '@tldraw/dotcom-shared'
import { RefObject } from 'react'
import {
	createComment,
	createCommentThread,
	createShapeId,
	Editor,
	TLComponents,
	Tldraw,
	TLStore,
	toRichText,
} from 'tldraw'
import { DEMO_AUTHORS } from './StyledThread'

const ME = 'me'

// The same people the gallery's demo thread uses, plus you.
const MEMBERS: MentionMember[] = [
	{ id: ME, name: 'You', color: '#0E9F6E', you: true },
	{ id: 'riley', ...DEMO_AUTHORS.riley },
	{ id: 'sam', ...DEMO_AUTHORS.sam },
]

const AUTHORS: Record<string, CommentAuthor> = Object.fromEntries(MEMBERS.map((m) => [m.id, m]))
const resolveAuthor = (id: string): CommentAuthor => AUTHORS[id] ?? { name: id }

// The mention roster is open: type any name after `@` and it's offered as a member. A real app
// would query its own directory here — this stands in for one that accepts anyone. The synthetic
// member's id is the name itself, so `resolveAuthor`'s fallback renders it correctly everywhere.
const GUEST_COLORS = ['#EC5E41', '#4465E9', '#0E9F6E', '#9C1FBE', '#D97706', '#0E7490']
const guestColor = (name: string) =>
	GUEST_COLORS[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % GUEST_COLORS.length]

function getMentionSuggestions(query: string): MentionMember[] {
	const matches = filterMentionMembers(MEMBERS, query)
	const name = query.trim()
	if (name && !matches.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
		matches.push({ id: name, name, color: guestColor(name), secondary: 'Mention anyone' })
	}
	return matches
}

const COMMENT_TOOLS = [CommentTool.configure({ enableRegions: true })]

const components: TLComponents = {
	InFrontOfTheCanvas: () => (
		<CanvasComments
			currentUserId={ME}
			resolveAuthor={resolveAuthor}
			getMentionSuggestions={getMentionSuggestions}
		/>
	),
}

const MINUTE = 60 * 1000

// Seed a couple of shapes and threads so every brand has something to open. Comments are records
// in the editor's own store (`commentSchemaRecords` on the schema), so they persist across the
// mode toggle — and would sync and persist like shapes in a real app.
function handleMount(editor: Editor) {
	const heroId = createShapeId()
	editor.run(
		() => {
			editor.createShapes([
				{
					id: heroId,
					type: 'geo',
					x: 160,
					y: 160,
					props: { geo: 'rectangle', w: 300, h: 180, richText: toRichText('Homepage hero') },
				},
				{
					id: createShapeId(),
					type: 'geo',
					x: 520,
					y: 200,
					props: { geo: 'rectangle', w: 200, h: 140, richText: toRichText('Pricing card') },
				},
			])
		},
		{ history: 'ignore' }
	)

	const pageId = editor.getCurrentPageId()
	const now = Date.now()

	const heroThread = createCommentThread({
		pageId,
		anchor: { type: 'shape', shapeId: heroId, x: 0.7, y: 0.3, isPrecise: true },
		createdBy: 'riley',
		now: now - 52 * MINUTE,
	})
	const pointThread = createCommentThread({
		pageId,
		anchor: { type: 'point', x: 620, y: 420 },
		createdBy: 'sam',
		now: now - 18 * MINUTE,
	})

	putCommentRecords(editor, [
		heroThread,
		pointThread,
		createComment({
			threadId: heroThread.id,
			pageId,
			authorId: 'riley',
			body: toRichText('Can we push the logo up a touch? It’s fighting the headline.'),
			now: now - 52 * MINUTE,
		}),
		createComment({
			threadId: heroThread.id,
			pageId,
			authorId: ME,
			body: toRichText('Good catch — moved it up 8px. How’s this?'),
			now: now - 31 * MINUTE,
		}),
		createComment({
			threadId: pointThread.id,
			pageId,
			authorId: 'sam',
			body: toRichText('Does the pricing card need a shadow at this scale?'),
			now: now - 18 * MINUTE,
		}),
	])

	editor.zoomToBounds({ x: 40, y: 60, w: 820, h: 480 }, { immediate: true })
}

/**
 * The live commenting experience — the comment tool, pins, threads, mentions, reactions,
 * drag-to-re-anchor — under whichever brand is active. The `data-comment-theme` attribute on the
 * wrapper is all the theming there is: the generated token blocks target the comment elements
 * inside it, so switching brands restyles the comment layer in place and only the comment layer.
 */
export function CanvasView({
	store,
	themeId,
	containerRef,
}: {
	store: TLStore
	themeId: string
	/** The export target — "export open thread" rasterizes the `.tlui-cmt-thread` inside this. */
	containerRef: RefObject<HTMLDivElement | null>
}) {
	return (
		<div className="bcg-canvas" data-comment-theme={themeId} ref={containerRef}>
			<Tldraw
				// Commenting is a licensed feature. Every feature is enabled in local development, but a
				// deployed app needs a license key that includes commenting — swap in your own key here.
				licenseKey={getLicenseKey()}
				store={store}
				onMount={handleMount}
				tools={COMMENT_TOOLS}
				overrides={[commentToolOverrides]}
				components={components}
			/>
		</div>
	)
}
