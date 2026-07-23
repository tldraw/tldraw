import {
	CanvasComments,
	CommentAuthor,
	CommentTool,
	commentToolOverrides,
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
} from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'

// One configured comment tool per mode, built once at module level so each array keeps a stable
// identity. `shouldBePrecise` decides what commenting on a shape produces: a precise anchor
// (pinned to the exact clicked spot within the shape — the default) or an imprecise one (pinned
// to the shape as a whole, rendered at its top-right). It's called with the target shape, the
// release point, and the Alt key's state — so it can be a constant, an Alt-gated choice, or a
// decision from the shape itself, like "precise only on notes".
const MODE_TOOLS = {
	always: [CommentTool],
	never: [CommentTool.configure({ shouldBePrecise: () => false })],
	alt: [CommentTool.configure({ shouldBePrecise: (_editor, { altKey }) => altKey })],
	notes: [
		CommentTool.configure({
			shouldBePrecise: (editor, { shapeId }) => editor.getShape(shapeId)?.type === 'note',
		}),
	],
}

type PrecisionMode = keyof typeof MODE_TOOLS

const MODE_LABELS: Record<PrecisionMode, string> = {
	always: 'Always precise (default)',
	never: 'Shape only',
	alt: 'Alt for precise',
	notes: 'Notes precise',
}

const AUTHORS: Record<string, CommentAuthor> = { me: { name: 'You', color: '#EC5E41' } }
const resolveAuthor = (id: string): CommentAuthor => AUTHORS[id] ?? { name: id }

const handleMount = (editor: Editor) => {
	// A shape and a note to comment on. The store survives mode switches, so only seed once.
	if (editor.getCurrentPageShapeIds().size === 0) {
		editor.run(
			() => {
				editor.createShapes([
					{
						type: 'geo',
						x: 100,
						y: 160,
						props: { geo: 'rectangle', w: 280, h: 180, richText: toRichText('A shape') },
					},
					{
						type: 'note',
						x: 460,
						y: 150,
						props: { richText: toRichText('A note') },
					},
				])
			},
			{ history: 'ignore' }
		)
	}
	editor.zoomToBounds({ x: 40, y: 60, w: 700, h: 400 }, { immediate: true })
}

export default function CommentShapePrecisionExample() {
	const [mode, setMode] = useState<PrecisionMode>('always')

	// Comments live in the editor's own store as records; sharing one store across mode switches
	// keeps every placed thread visible while the tool is reconfigured.
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
				// Commenting options are fixed at tool registration (`CommentTool.configure`), so
				// switching modes remounts the editor with the newly configured tool. The shared store
				// carries the comments across.
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
				<div
					style={{
						position: 'absolute',
						top: 60,
						left: 12,
						display: 'flex',
						gap: 4,
						zIndex: 1000,
					}}
				>
					{(Object.keys(MODE_LABELS) as PrecisionMode[]).map((id) => (
						<TldrawUiButton
							key={id}
							type={mode === id ? 'primary' : 'normal'}
							onClick={() => setMode(id)}
						>
							<TldrawUiButtonLabel>{MODE_LABELS[id]}</TldrawUiButtonLabel>
						</TldrawUiButton>
					))}
				</div>
			</Tldraw>
		</div>
	)
}
