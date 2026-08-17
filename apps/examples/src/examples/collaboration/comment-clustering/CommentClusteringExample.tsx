import {
	CanvasComments,
	CommentAuthor,
	commentToolOverrides,
	commentTools,
	putCommentRecords,
} from '@tldraw/commenting'
import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useMemo } from 'react'
import {
	commentSchemaRecords,
	createComment,
	createCommentThread,
	createTLSchema,
	createTLStore,
	Editor,
	TLComponents,
	Tldraw,
	toRichText,
	VecLike,
} from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'
import './comment-clustering.css'

const AUTHORS: Record<string, CommentAuthor> = {
	ada: { name: 'Ada Lovelace', color: '#0E9F6E' },
	grace: { name: 'Grace Hopper', color: '#4465E9' },
	me: { name: 'You', color: '#EC5E41' },
}
const resolveAuthor = (id: string): CommentAuthor => AUTHORS[id] ?? { name: id }

// [1]
const THREADS: { point: VecLike; by: string; text: string }[] = [
	{ point: { x: 250, y: 140 }, by: 'ada', text: 'Should this column be wider?' },
	{ point: { x: 300, y: 170 }, by: 'grace', text: 'Agreed, it wraps on mobile.' },
	{ point: { x: 265, y: 220 }, by: 'ada', text: 'Same for the row beneath it.' },
	{ point: { x: 800, y: 250 }, by: 'grace', text: 'This label reads as a button.' },
	{ point: { x: 845, y: 285 }, by: 'ada', text: 'Let’s make it a link instead.' },
]

export default function CommentClusteringExample() {
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	const handleMount = (editor: Editor) => {
		const pageId = editor.getCurrentPageId()
		for (const { point, by, text } of THREADS) {
			const thread = createCommentThread({
				pageId,
				anchor: { type: 'point', x: point.x, y: point.y },
				createdBy: by,
			})
			const comment = createComment({
				threadId: thread.id,
				pageId,
				authorId: by,
				body: toRichText(text),
			})
			putCommentRecords(editor, [thread, comment])
		}
	}

	const components = useMemo<TLComponents>(
		() => ({
			InFrontOfTheCanvas: () => <CanvasComments currentUserId="me" resolveAuthor={resolveAuthor} />,
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
				onMount={handleMount}
			/>
			<div className="comment-clustering__hint">Zoom out to cluster (⌘/ctrl-scroll or pinch)</div>
		</div>
	)
}

/*
[1]
Two clusters of pins, far enough apart that they stay separate while the ones within each group
merge. Zoom out and each group folds into a single count badge; zoom back in and they split apart.
Splits happen at a wider spacing than merges, so pins don't flicker at the threshold, and clicking a
badge zooms to just past the point where it splits.

Clustering is on by default and needs no configuration. Turn it off with
`CommentTool.configure({ enableClustering: false })` and every pin renders individually at every
zoom.
*/
