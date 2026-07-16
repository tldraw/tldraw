import {
	CanvasComments,
	commentToolOverrides,
	commentTools,
	putCommentRecords,
} from '@tldraw/commenting/canvas'
import { useMemo } from 'react'
import {
	commentSchemaRecords,
	createComment,
	createCommentThread,
	createShapeId,
	createTLSchema,
	createTLStore,
	Editor,
	TLCommentAnchor,
	TLComponents,
	Tldraw,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'

const NAMES: Record<string, string> = { ada: 'Ada Lovelace', me: 'You' }
const resolveName = (id: string): string => NAMES[id] ?? id

// A thread plus its opening comment, anchored however the caller specifies. Every `TLCommentThread`
// carries an `anchor` — a discriminated union — and `CanvasComments` renders each kind in the right
// place: shape/text-range pins track the shape, point/region pins sit at fixed page coordinates.
function seedThread(editor: Editor, anchor: TLCommentAnchor, text: string) {
	const pageId = editor.getCurrentPageId()
	const thread = createCommentThread({ pageId, anchor, createdBy: 'ada' })
	const comment = createComment({
		threadId: thread.id,
		pageId,
		authorId: 'ada',
		body: toRichText(text),
	})
	putCommentRecords(editor, [thread, comment])
}

export default function CommentAnchorsExample() {
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	const handleMount = (editor: Editor) => {
		// A rectangle to anchor shape comments against.
		const boxId = createShapeId()
		editor.run(
			() => {
				editor.createShapes([
					{ id: boxId, type: 'geo', x: 120, y: 100, props: { geo: 'rectangle', w: 200, h: 140 } },
				])

				// shape (imprecise): normalized x/y ignored for the pin, which sits at the shape's
				// top-right badge spot. The anchor still tracks the shape as it moves and resizes.
				seedThread(
					editor,
					{ type: 'shape', shapeId: boxId, x: 1, y: 0, isPrecise: false },
					'Anchored to this shape (imprecise — sits at the corner).'
				)
				// shape (precise): the pin sits exactly at the stored normalized spot inside the shape.
				seedThread(
					editor,
					{ type: 'shape', shapeId: boxId, x: 0.5, y: 0.6, isPrecise: true },
					'Anchored to a precise spot inside the shape.'
				)
				// point: a bare page coordinate, unattached to any shape.
				seedThread(editor, { type: 'point', x: 200, y: 340 }, 'Anchored to a point on the page.')
				// region: a rectangular area; the pin sits on its corner and the box is drawn.
				seedThread(
					editor,
					{ type: 'region', x: 380, y: 300, w: 200, h: 130 },
					'Anchored to a region of the page.'
				)
			},
			{ history: 'ignore' }
		)

		editor.zoomToBounds({ x: 60, y: 60, w: 600, h: 420 }, { immediate: true })
	}

	const components = useMemo<TLComponents>(
		() => ({
			InFrontOfTheCanvas: () => <CanvasComments currentUserId="me" resolveName={resolveName} />,
		}),
		[]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw
				store={store}
				onMount={handleMount}
				tools={commentTools}
				overrides={[commentToolOverrides]}
				components={components}
			/>
		</div>
	)
}
