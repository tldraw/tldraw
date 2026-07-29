import {
	CanvasComments,
	CommentAuthor,
	CommentTool,
	commentToolOverrides,
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
} from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'

const AUTHORS: Record<string, CommentAuthor> = {
	ada: { name: 'Ada Lovelace', color: '#0E9F6E' },
	me: { name: 'You', color: '#EC5E41' },
}
const resolveAuthor = (id: string): CommentAuthor => AUTHORS[id] ?? { name: id }

// [1]
const COMMENT_TOOLS = [CommentTool.configure({ enableRegions: true })]

const components: TLComponents = {
	InFrontOfTheCanvas: () => <CanvasComments currentUserId="me" resolveAuthor={resolveAuthor} />,
}

// [2]
const handleMount = (editor: Editor) => {
	editor.run(
		() => {
			editor.createShapes([
				{
					type: 'geo',
					x: 150,
					y: 150,
					props: { geo: 'rectangle', w: 160, h: 100, richText: toRichText('A shape') },
				},
				{
					type: 'geo',
					x: 350,
					y: 180,
					props: { geo: 'ellipse', w: 120, h: 120, richText: toRichText('Another') },
				},
			])
			const pageId = editor.getCurrentPageId()
			const thread = createCommentThread({
				pageId,
				anchor: { type: 'region', x: 120, y: 120, w: 380, h: 210 },
				createdBy: 'ada',
			})
			const comment = createComment({
				threadId: thread.id,
				pageId,
				authorId: 'ada',
				body: toRichText(
					'This thread is anchored to a region covering both shapes. Move it by its pin, or resize it from a corner.'
				),
			})
			putCommentRecords(editor, [thread, comment])
		},
		{ history: 'ignore' }
	)
	editor.zoomToBounds({ x: 40, y: 40, w: 600, h: 420 }, { immediate: true })
}

export default function CommentRegionsExample() {
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	return (
		<div className="tldraw__editor">
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

/*
A region anchor attaches a thread to a rectangular area of the page rather than to a point or a
shape.

[1]
Regions are off by default — the comment tool places points and shape anchors, and a drag just
trails the composer. `enableRegions` turns them on, and that's the whole configuration: a region
reveals its dashed box while the pointer is inside it, moves by its pin, and resizes from its
corners. The pin sits on whichever corner the creating drag released on.

[2]
Seed a region thread covering two shapes so there's one to play with immediately. A region anchor
is a page-fixed rectangle — it covers the shapes visually but isn't attached to them, so moving a
shape doesn't move the region. Select the comment tool (or press `c`) and drag to create more.
*/
