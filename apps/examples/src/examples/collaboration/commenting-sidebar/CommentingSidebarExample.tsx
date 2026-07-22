import {
	CanvasComments,
	CanvasCommentsSidebar,
	CommentAuthor,
	commentsSidebarOpen,
	commentToolOverrides,
	commentTools,
	getCommentThreads,
	putCommentRecords,
	toggleCommentsSidebar,
} from '@tldraw/commenting'
import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useMemo } from 'react'
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
	TldrawUiButton,
	TldrawUiButtonLabel,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'

// A tiny local user directory so the list shows names instead of ids.
const AUTHORS: Record<string, CommentAuthor> = {
	me: { name: 'You', color: '#EC5E41' },
	ada: { name: 'Ada Lovelace', color: '#0E9F6E' },
	grace: { name: 'Grace Hopper', color: '#4465E9' },
}
const resolveAuthor = (id: string): CommentAuthor => AUTHORS[id] ?? { name: id }

// Two pages with a thread each (so the sidebar's every-page default and page labels have
// something to show) plus a resolved thread, hidden until "show resolved" is toggled on.
function seed(editor: Editor) {
	// Hot reload and remounts re-run onMount — never seed twice.
	if (getCommentThreads(editor).length > 0) return

	const pageOne = editor.getCurrentPageId()
	const boxOne = createShapeId('sidebar-box-one')
	editor.createShape({ id: boxOne, type: 'geo', x: 180, y: 140, props: { w: 320, h: 220 } })

	editor.createPage({ name: 'Page 2' })
	const pageTwo = editor.getPages()[1].id
	editor.setCurrentPage(pageTwo)
	const boxTwo = createShapeId('sidebar-box-two')
	editor.createShape({
		id: boxTwo,
		type: 'geo',
		x: 240,
		y: 200,
		props: { w: 280, h: 200, geo: 'ellipse' },
	})
	editor.setCurrentPage(pageOne)

	const now = Date.now()
	const records = [
		{
			pageId: pageOne,
			shapeId: boxOne,
			author: 'ada',
			text: 'Is this the final position for this box?',
			minutesAgo: 45,
		},
		{
			pageId: pageTwo,
			shapeId: boxTwo,
			author: 'grace',
			text: 'The ellipse reads better than the rectangle did.',
			minutesAgo: 20,
		},
	].flatMap(({ pageId, shapeId, author, text, minutesAgo }) => {
		const thread = createCommentThread({
			pageId,
			anchor: { type: 'shape', shapeId, x: 0.5, y: 0.5, isPrecise: false },
			createdBy: author,
		})
		const comment = createComment({
			threadId: thread.id,
			pageId,
			authorId: author,
			body: toRichText(text),
		})
		const createdAt = now - minutesAgo * 60_000
		return [
			{ ...thread, createdAt },
			{ ...comment, createdAt },
		]
	})

	const resolvedThread = createCommentThread({
		pageId: pageOne,
		anchor: { type: 'point', x: 620, y: 420 },
		createdBy: 'me',
	})
	const resolvedComment = createComment({
		threadId: resolvedThread.id,
		pageId: pageOne,
		authorId: 'me',
		body: toRichText('Fixed the spacing here.'),
	})
	records.push(
		{
			...resolvedThread,
			createdAt: now - 90 * 60_000,
			resolved: { at: now - 60 * 60_000, by: 'me' },
		},
		{ ...resolvedComment, createdAt: now - 90 * 60_000 }
	)

	putCommentRecords(editor, records)
	commentsSidebarOpen.set(editor, true)
}

// The host supplies the sidebar's open/close affordance. Here it's a button in the share-panel
// slot — the same top-right spot tldraw.com uses. (The comment tool closes the sidebar while
// it's active, so the button is how it comes back.)
function SidebarToggle() {
	const editor = useEditor()
	const open = useValue('sidebar open', () => commentsSidebarOpen.get(editor), [editor])
	return (
		<div style={{ pointerEvents: 'all', display: 'flex', padding: 4 }}>
			<TldrawUiButton type="normal" onClick={() => toggleCommentsSidebar(editor)}>
				<TldrawUiButtonLabel>{open ? 'Hide comments' : 'Comments'}</TldrawUiButtonLabel>
			</TldrawUiButton>
		</div>
	)
}

export default function CommentingSidebarExample() {
	// Comments are stored as records in the editor's own store — registering the comment schema
	// records is all it takes to persist and sync them alongside shapes.
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	const components = useMemo<TLComponents>(
		() => ({
			InFrontOfTheCanvas: () => (
				<>
					<CanvasComments currentUserId="me" resolveAuthor={resolveAuthor} />
					<CanvasCommentsSidebar currentUserId="me" resolveAuthor={resolveAuthor} />
				</>
			),
			SharePanel: SidebarToggle,
		}),
		[]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw
				licenseKey={getLicenseKey()}
				store={store}
				tools={commentTools}
				overrides={[commentToolOverrides]}
				components={components}
				onMount={seed}
			/>
		</div>
	)
}
