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

// Two independent settings govern what commenting on a shape produces, so the example offers a row
// of buttons for each and combines the pair into one configured tool.

// `shouldBePrecise` decides where the pin ends up: at the exact clicked spot within the shape, or
// on the shape as a whole (rendered at its top-right by default). It's called with the target
// shape, the release point, and the Alt key's state — so it can be a constant, the Alt default, or
// a decision from the shape itself, like "precise only on notes".
const PRECISION_MODES = {
	always: { label: 'Always precise', options: { shouldBePrecise: () => true } },
	never: { label: 'Shape only', options: { shouldBePrecise: () => false } },
	alt: { label: 'Alt for precise (default)', options: {} },
	notes: {
		label: 'Notes precise',
		options: {
			shouldBePrecise: (editor: Editor, { shapeId }: { shapeId: string }) =>
				editor.getShape(shapeId as any)?.type === 'note',
		},
	},
} satisfies Record<string, { label: string; options: Partial<CommentingOptions> }>

// `shapeAnchorTargets` decides what counts as being over a shape in the first place. Try clicking
// the blank middle of the rectangle under each: `'area'` attaches to it, `'outline'` leaves the
// comment a free point on the page, because the rectangle has no fill to land on.
const TARGET_MODES = {
	area: { label: 'Whole shape', options: { shapeAnchorTargets: 'area' } },
	outline: { label: 'Outline only', options: { shapeAnchorTargets: 'outline' } },
} satisfies Record<string, { label: string; options: Partial<CommentingOptions> }>

type PrecisionMode = keyof typeof PRECISION_MODES
type TargetMode = keyof typeof TARGET_MODES

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

function ModeButtons<M extends Record<string, { label: string }>>({
	modes,
	value,
	onChange,
}: {
	modes: M
	value: keyof M
	onChange(next: keyof M): void
}) {
	return (
		<div style={{ display: 'flex', gap: 4 }}>
			{(Object.keys(modes) as (keyof M & string)[]).map((id) => (
				<TldrawUiButton
					key={id}
					type={value === id ? 'primary' : 'normal'}
					onClick={() => onChange(id)}
				>
					<TldrawUiButtonLabel>{modes[id].label}</TldrawUiButtonLabel>
				</TldrawUiButton>
			))}
		</div>
	)
}

export default function CommentShapePrecisionExample() {
	const [precision, setPrecision] = useState<PrecisionMode>('alt')
	const [target, setTarget] = useState<TargetMode>('area')

	// Comments live in the editor's own store as records; sharing one store across mode switches
	// keeps every placed thread visible while the tool is reconfigured.
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	// One configured tool per combination of the two settings. Memoized so the array keeps a stable
	// identity while the selection holds — a fresh array every render would remount the editor
	// continuously, via the `key` below.
	const tools = useMemo(
		() => [
			CommentTool.configure({
				...PRECISION_MODES[precision].options,
				...TARGET_MODES[target].options,
			}),
		],
		[precision, target]
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
				key={`${precision}:${target}`}
				// Commenting is a licensed feature. Every feature is enabled in local development, but a
				// deployed app needs a license key that includes commenting — swap in your own key here.
				licenseKey={getLicenseKey()}
				store={store}
				onMount={handleMount}
				tools={tools}
				overrides={[commentToolOverrides]}
				components={components}
			>
				<div
					style={{
						position: 'absolute',
						top: 60,
						left: 12,
						display: 'flex',
						flexDirection: 'column',
						gap: 4,
						zIndex: 1000,
					}}
				>
					<ModeButtons modes={PRECISION_MODES} value={precision} onChange={setPrecision} />
					<ModeButtons modes={TARGET_MODES} value={target} onChange={setTarget} />
				</div>
			</Tldraw>
		</div>
	)
}
