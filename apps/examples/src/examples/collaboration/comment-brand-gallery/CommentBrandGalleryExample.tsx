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
import { useMemo, useRef, useState } from 'react'
import {
	commentSchemaRecords,
	createComment,
	createCommentThread,
	createShapeId,
	createTLSchema,
	createTLStore,
	Editor,
	TLComponents,
	Tldraw,
	toRichText,
} from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'
import { exportNodeAsPng } from './export-png'
import { DEMO_AUTHORS, StyledThread } from './StyledThread'
import { BRAND_THEMES } from './themes'
import './brand-themes.css'

const ME = 'me'

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

// [3]
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

export default function CommentBrandGalleryExample() {
	const [mode, setMode] = useState<'gallery' | 'canvas'>('gallery')
	const [themeId, setThemeId] = useState('midnight')
	const [exporting, setExporting] = useState(false)
	const stageRefs = useRef(new Map<string, HTMLDivElement>())
	const canvasRef = useRef<HTMLDivElement>(null)

	// The store outlives the mode toggle, so comments you post in canvas mode survive a trip to
	// the gallery and back.
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	// [4]
	const exportOne = async (id: string) => {
		const node = stageRefs.current.get(id)
		if (node) await exportNodeAsPng(node, `comments-${id}`)
	}

	const exportAll = async () => {
		setExporting(true)
		try {
			for (const theme of BRAND_THEMES) {
				await exportOne(theme.id)
				// Browsers throttle bursts of programmatic downloads; a beat between each keeps all
				// eighteen arriving.
				await new Promise((resolve) => setTimeout(resolve, 350))
			}
		} finally {
			setExporting(false)
		}
	}

	const exportOpenThread = async () => {
		const node = canvasRef.current?.querySelector<HTMLElement>('.tlui-cmt-thread')
		if (node) await exportNodeAsPng(node, `comments-${themeId}-thread`)
	}

	return (
		<div className="bcg-root">
			<div className="bcg-topbar">
				<span className="bcg-topbar__title">Comment brand gallery</span>
				<div className="bcg-seg">
					<button
						className="bcg-seg__btn"
						data-active={mode === 'gallery'}
						onClick={() => setMode('gallery')}
					>
						Gallery
					</button>
					<button
						className="bcg-seg__btn"
						data-active={mode === 'canvas'}
						onClick={() => setMode('canvas')}
					>
						Live canvas
					</button>
				</div>
				{mode === 'gallery' ? (
					<>
						<button className="bcg-btn" onClick={exportAll} disabled={exporting}>
							{exporting ? 'Exporting…' : 'Export all as PNG'}
						</button>
						<span className="bcg-hint">
							Click text or names to edit the copy, and click reactions to toggle them. Exports are
							transparent PNGs.
						</span>
					</>
				) : (
					<>
						<div className="bcg-chips">
							{BRAND_THEMES.map((theme) => (
								<button
									key={theme.id}
									className="bcg-chip"
									data-active={theme.id === themeId}
									onClick={() => setThemeId(theme.id)}
								>
									{theme.name}
								</button>
							))}
						</div>
						<button className="bcg-btn" onClick={exportOpenThread}>
							Export open thread
						</button>
					</>
				)}
			</div>

			{mode === 'gallery' ? (
				// [1]
				<div className="bcg-gallery">
					{BRAND_THEMES.map((theme) => (
						<div key={theme.id} className="bcg-tile">
							<div className="bcg-tile__head">
								<span className="bcg-tile__name">{theme.name}</span>
								<span className="bcg-tile__tagline">{theme.tagline}</span>
								<button className="bcg-btn" onClick={() => exportOne(theme.id)}>
									PNG
								</button>
							</div>
							<div className="bcg-tile__floor" data-dark={theme.dark ?? false}>
								<div
									className="brand-stage"
									data-comment-theme={theme.id}
									ref={(node) => {
										if (node) stageRefs.current.set(theme.id, node)
										else stageRefs.current.delete(theme.id)
									}}
								>
									<StyledThread />
								</div>
							</div>
						</div>
					))}
				</div>
			) : (
				// [2]
				<div className="bcg-canvas" data-comment-theme={themeId} ref={canvasRef}>
					<Tldraw
						// Commenting is a licensed feature. Every feature is enabled in local development,
						// but a deployed app needs a license key that includes commenting — swap in your
						// own key here.
						licenseKey={getLicenseKey()}
						store={store}
						onMount={handleMount}
						tools={COMMENT_TOOLS}
						overrides={[commentToolOverrides]}
						components={components}
					/>
				</div>
			)}
		</div>
	)
}

/*
This example shows how far the commenting UI can be pushed visually: eighteen "brands", each a
complete restyle of the same components, plus transparent-PNG export of any of them.

[1]
The gallery renders the same demo thread once per brand, using the SDK's presentational pieces
(`CommentThread`, `CommentPin`, `Avatar`, `Reactions`) — no store, no editor. Everything the
commenting UI draws is a `tlui-cmt-*` class driven by tldraw's CSS tokens, so each brand in
brand-themes.css is mostly a token block: redefine `--tl-color-panel`, the text colors, the radii,
and the marker shadows under `[data-comment-theme='<id>']` and the whole surface follows. A few
rules per brand handle what tokens can't say — fonts, borders, gradients, pin shapes.

The tiles are working mockups, not screenshots: the copy is editable in place (bodies, names, even
the composer placeholder — and a renamed author's avatar updates its initial), and reaction pills
toggle on click, disappearing when their count hits zero. So the deck can speak each brand's
language before it's exported.

[2]
The live canvas is the full commenting experience — the comment tool, pins, threads, mentions
(with an open roster: any name typed after `@` becomes a member), reactions, drag-to-re-anchor —
with the same `data-comment-theme` attribute on its wrapper.
Switching chips restyles the real UI in place, and only the comment layer: the tokens are
redefined on the comment elements themselves, so the toolbar and menus keep their stock look.

[3]
The canvas seeds a couple of shapes and threads so every brand has something to open. Comments
are records in the editor's own store (`commentSchemaRecords` on the schema), so they persist
across the mode toggle — and would sync and persist like shapes in a real app.

[4]
Export rasterizes the tile's DOM node (via `html-to-image`) at 2x with no background color, so
the PNG is transparent everywhere the comment UI didn't paint — ready to drop onto a slide. The
canvas mode exports whatever thread is open, styled by whichever brand is active.
*/
