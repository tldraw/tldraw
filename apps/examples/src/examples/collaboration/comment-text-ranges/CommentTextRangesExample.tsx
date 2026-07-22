import {
	CanvasComments,
	commentToolOverrides,
	commentTools,
	pendingComment,
	putCommentRecords,
} from '@tldraw/commenting'
import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useEffect, useMemo, useState } from 'react'
import {
	DefaultRichTextToolbar,
	DefaultRichTextToolbarContent,
	Editor,
	TLComponents,
	Tldraw,
	TldrawUiButtonIcon,
	TldrawUiToolbarButton,
	commentSchemaRecords,
	createComment,
	createCommentThread,
	createShapeId,
	createTLSchema,
	createTLStore,
	preventDefault,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'
import { trackTextRangeAnchors } from './text-range-tracking'
import './comment-text-ranges.css'
import { TextRangeHighlights } from './TextRangeHighlights'

const NAMES: Record<string, string> = { ada: 'Ada Lovelace', me: 'You' }
const resolveName = (id: string): string => NAMES[id] ?? id

/**
 * Turn the current text selection into a pending `text-range` comment: read the tiptap selection
 * of the shape being edited, convert the ProseMirror positions to plaintext character offsets, and
 * open the comment composer anchored to that range. Posting from the composer creates the thread
 * and comment through the normal pending-comment flow — no extra records needed.
 *
 * A `text-range` anchor's `from`/`to` are plaintext offsets (not ProseMirror positions), so the
 * highlight overlay can walk the shape's rendered text nodes to measure the range. Offsets alone
 * would go stale as soon as the text changed, so `trackTextRangeAnchors` maps them through every
 * subsequent edit to keep each anchor on the words it was written about.
 */
function startTextRangeComment(editor: Editor) {
	const textEditor = editor.getRichTextEditor()
	if (!textEditor) return

	const shapeId = editor.getEditingShapeId()
	if (!shapeId) return

	const { from, to, empty } = textEditor.state.selection
	if (empty) return

	const doc = textEditor.state.doc
	const anchorFrom = doc.textBetween(0, from).length
	const anchorTo = doc.textBetween(0, to).length
	if (anchorFrom === anchorTo) return

	// The composer opens at the shape's top-right corner, where the overlay pins text-range threads.
	const bounds = editor.getShapePageBounds(shapeId)
	if (!bounds) return

	// End the editing session — the composer takes over from here, and the highlight overlay can
	// only measure the shape's static text DOM, which is unmounted while the shape is being edited.
	editor.setEditingShape(null)

	pendingComment.set(editor, {
		anchor: { type: 'text-range', shapeId, from: anchorFrom, to: anchorTo },
		point: { x: bounds.maxX, y: bounds.minY },
	})
}

/**
 * The default rich text toolbar plus a comment button. The button is disabled until some text is
 * selected; pressing it hands the selection to `startTextRangeComment`.
 */
function CommentRichTextToolbar() {
	const editor = useEditor()
	const textEditor = useValue('textEditor', () => editor.getRichTextEditor(), [editor])

	// Re-render on every tiptap transaction so the button's disabled state tracks the selection.
	const [, setTick] = useState(0)
	useEffect(() => {
		if (!textEditor) return
		const onTransaction = () => setTick((t) => t + 1)
		textEditor.on('transaction', onTransaction)
		return () => {
			textEditor.off('transaction', onTransaction)
		}
	}, [textEditor])

	if (!textEditor) return null

	const canComment = textEditor.view ? !textEditor.state.selection.empty : false

	return (
		<DefaultRichTextToolbar>
			<DefaultRichTextToolbarContent textEditor={textEditor} />
			<TldrawUiToolbarButton
				title="Comment"
				data-testid="rich-text.comment"
				type="icon"
				disabled={!canComment}
				// Keep the text selection and editing session alive when the button is pressed.
				onPointerDown={preventDefault}
				onClick={() => startTextRangeComment(editor)}
				role="option"
			>
				<TldrawUiButtonIcon small icon="comment" />
			</TldrawUiToolbarButton>
		</DefaultRichTextToolbar>
	)
}

const components: TLComponents = {
	RichTextToolbar: CommentRichTextToolbar,
	InFrontOfTheCanvas: () => (
		<>
			<TextRangeHighlights />
			<CanvasComments currentUserId="me" resolveName={resolveName} />
		</>
	),
}

const SEEDED_TEXT =
	'Double-click to edit this text, select a few words, and press the comment button in the toolbar.'

export default function CommentTextRangesExample() {
	// Comments are `comment-thread` and `comment` records in the editor's own store; registering
	// `commentSchemaRecords` on the schema is all it takes to store them alongside shapes.
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	const handleMount = (editor: Editor) => {
		const textId = createShapeId()
		editor.run(
			() => {
				editor.createShapes([
					{
						id: textId,
						type: 'text',
						x: 120,
						y: 160,
						props: { richText: toRichText(SEEDED_TEXT), w: 440, autoSize: false },
					},
				])

				// Seed one thread on the words "comment button" so a highlight is visible right away.
				const from = SEEDED_TEXT.indexOf('comment button')
				const to = from + 'comment button'.length
				const pageId = editor.getCurrentPageId()
				const thread = createCommentThread({
					pageId,
					anchor: { type: 'text-range', shapeId: textId, from, to },
					createdBy: 'ada',
				})
				const comment = createComment({
					threadId: thread.id,
					pageId,
					authorId: 'ada',
					body: toRichText('This range is commented — click the highlight to open the thread.'),
				})
				putCommentRecords(editor, [thread, comment])
			},
			{ history: 'ignore' }
		)

		editor.zoomToBounds({ x: 40, y: 60, w: 620, h: 320 }, { immediate: true })

		// Keep every text-range anchor pointing at the same words as the text is edited.
		return trackTextRangeAnchors(editor)
	}

	return (
		<div className="tldraw__editor">
			<Tldraw
				// Commenting is a licensed feature. Every feature is enabled in local development, but a
				// deployed app needs a license key that includes commenting — swap in your own key here.
				licenseKey={getLicenseKey()}
				store={store}
				onMount={handleMount}
				tools={commentTools}
				overrides={[commentToolOverrides]}
				components={components}
			/>
		</div>
	)
}
