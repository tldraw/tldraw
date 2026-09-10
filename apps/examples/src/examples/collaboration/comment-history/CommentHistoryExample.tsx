import {
	CanvasComments,
	CommentAuthor,
	CommentTool,
	commentToolOverrides,
	useComments,
	useCommentThreads,
} from '@tldraw/commenting'
import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useMemo, useState } from 'react'
import {
	commentSchemaRecords,
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
import './comment-history.css'

// [1]
const MODE_TOOLS = {
	ignore: [CommentTool],
	record: [CommentTool.configure({ history: 'record' })],
	drag: [CommentTool.configure({ dragHistory: 'record' })],
}

type HistoryMode = keyof typeof MODE_TOOLS

const MODE_LABELS: Record<HistoryMode, string> = {
	ignore: 'Ignore (default)',
	record: 'Record everything',
	drag: 'Record pin drags only',
}

const MODE_HINTS: Record<HistoryMode, string> = {
	ignore: 'Undo rewinds the shape. Comments and pin positions stay put.',
	record: 'Undo rewinds comments too — the last thing you did, whatever it was.',
	drag: 'Undo rewinds the shape and pin drags, but never a posted comment.',
}

const AUTHORS: Record<string, CommentAuthor> = { me: { name: 'You', color: '#EC5E41' } }
const resolveAuthor = (id: string): CommentAuthor => AUTHORS[id] ?? { name: id }

function handleMount(editor: Editor) {
	// The store outlives a mode switch, so only seed on the first mount.
	if (editor.getCurrentPageShapeIds().size === 0) {
		editor.run(
			() => {
				editor.createShapes([
					{
						type: 'geo',
						x: 180,
						y: 180,
						props: { geo: 'rectangle', w: 300, h: 200, richText: toRichText('Move me') },
					},
				])
			},
			// [2]
			{ history: 'ignore' }
		)
	}
	editor.zoomToBounds({ x: 100, y: 100, w: 620, h: 380 }, { immediate: true })
}

// [3]
function HistoryPanel({
	mode,
	onModeChange,
}: {
	mode: HistoryMode
	onModeChange(mode: HistoryMode): void
}) {
	const editor = useEditor()
	const threads = useCommentThreads(editor)
	const comments = useComments(editor)
	const canUndo = useValue('can undo', () => editor.getCanUndo(), [editor])
	const canRedo = useValue('can redo', () => editor.getCanRedo(), [editor])

	return (
		<div className="tlui-menu comment-history-panel">
			<div className="comment-history-panel__row">
				{(Object.keys(MODE_LABELS) as HistoryMode[]).map((id) => (
					<TldrawUiButton
						key={id}
						type={mode === id ? 'primary' : 'normal'}
						onClick={() => onModeChange(id)}
					>
						<TldrawUiButtonLabel>{MODE_LABELS[id]}</TldrawUiButtonLabel>
					</TldrawUiButton>
				))}
			</div>
			<div className="comment-history-panel__row">
				<TldrawUiButton type="normal" disabled={!canUndo} onClick={() => editor.undo()}>
					<TldrawUiButtonLabel>Undo</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="normal" disabled={!canRedo} onClick={() => editor.redo()}>
					<TldrawUiButtonLabel>Redo</TldrawUiButtonLabel>
				</TldrawUiButton>
				<span className="comment-history-panel__count">
					{threads.length} {threads.length === 1 ? 'thread' : 'threads'}, {comments.length}{' '}
					{comments.length === 1 ? 'comment' : 'comments'}
				</span>
			</div>
			<p className="comment-history-panel__hint">{MODE_HINTS[mode]}</p>
		</div>
	)
}

export default function CommentHistoryExample() {
	const [mode, setMode] = useState<HistoryMode>('ignore')

	// Comments are records in the editor's own store. Sharing one store across mode switches keeps
	// every thread you place while the tool is reconfigured.
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	const components = useMemo<TLComponents>(
		() => ({
			InFrontOfTheCanvas: () => <CanvasComments currentUserId="me" resolveAuthor={resolveAuthor} />,
		}),
		[]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw
				// [4]
				key={mode}
				// Commenting is a licensed feature. Every feature is enabled in local development, but a
				// deployed app needs a license key that includes commenting — swap in your own key here.
				licenseKey={getLicenseKey()}
				store={store}
				onMount={handleMount}
				tools={MODE_TOOLS[mode]}
				overrides={[commentToolOverrides]}
				components={components}
			>
				<HistoryPanel mode={mode} onModeChange={setMode} />
			</Tldraw>
		</div>
	)
}

/*
[1]
One configured comment tool per mode. `history` governs how every comment write — posting,
replying, editing, resolving, deleting — interacts with the editor's undo stack, and `dragHistory`
overrides it for pin drags alone.

`'ignore'` is the default, and it's the right one for a shared document: an undoable delete
resurrects a thread a collaborator already removed, and an undoable resolve reverts their newer
state. `'record'` is safe single-player, or against a comment store that isn't synced.

Pin drags are the interesting exception. Re-anchoring a comment is a spatial edit that may
reasonably undo alongside a shape move, so it can be recorded while posts stay ignored — the third
mode here.

[2]
The same option, used directly. Seeded shapes shouldn't be undoable either, so the seeding run is
wrapped in `history: 'ignore'` — otherwise the first undo would delete the shape the example is
about.

[3]
The counts come from `useCommentThreads` and `useComments`, which read the comment records
reactively. Watching them while you press undo is the whole point: in `'ignore'` mode they never
move, and in `'record'` mode they tick down.

[4]
Commenting options are fixed when the tool is registered, so switching modes remounts the editor
with a newly configured tool. The shared store carries the comments across, but the undo stack is
part of the editor, not the store — so it starts empty after every switch.
*/
