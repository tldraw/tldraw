import {
	CanvasComments,
	CommentAuthor,
	CommentingOptions,
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

type PrecisionMode = CommentingOptions['preciseShapeAnchors']

// One configured comment tool per mode, built once at module level so each array keeps a stable
// identity. `preciseShapeAnchors` decides what commenting on a shape produces: a precise anchor
// (pinned to the exact clicked spot within the shape — the `'always'` default), an imprecise one
// (pinned to the shape as a whole, rendered at its top-right), or the user's call per placement —
// `'alt'`: imprecise unless Alt is held while placing.
const MODE_TOOLS: Record<PrecisionMode, (typeof CommentTool)[]> = {
	always: [CommentTool.configure({ preciseShapeAnchors: 'always' })],
	never: [CommentTool.configure({ preciseShapeAnchors: 'never' })],
	alt: [CommentTool.configure({ preciseShapeAnchors: 'alt' })],
}

const MODE_LABELS: Record<PrecisionMode, string> = {
	always: 'Always precise (default)',
	never: 'Shape only',
	alt: 'Alt for precise',
}

const AUTHORS: Record<string, CommentAuthor> = { me: { name: 'You', color: '#EC5E41' } }
const resolveAuthor = (id: string): CommentAuthor => AUTHORS[id] ?? { name: id }

const handleMount = (editor: Editor) => {
	// A shape to comment on. The store survives mode switches, so only seed it once.
	if (editor.getCurrentPageShapeIds().size === 0) {
		editor.run(
			() => {
				editor.createShapes([
					{
						type: 'geo',
						x: 120,
						y: 140,
						props: {
							geo: 'rectangle',
							w: 320,
							h: 200,
							richText: toRichText('Comment on me'),
						},
					},
				])
			},
			{ history: 'ignore' }
		)
	}
	editor.zoomToBounds({ x: 40, y: 40, w: 520, h: 400 }, { immediate: true })
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
