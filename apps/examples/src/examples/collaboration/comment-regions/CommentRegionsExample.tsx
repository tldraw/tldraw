import {
	CanvasComments,
	CommentAuthor,
	CommentTool,
	commentToolOverrides,
	type CommentingOptions,
	putCommentRecords,
} from '@tldraw/commenting'
import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useMemo, useState } from 'react'
import {
	commentSchemaRecords,
	createComment,
	createCommentThread,
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
import './comment-regions.css'

const AUTHORS: Record<string, CommentAuthor> = {
	ada: { name: 'Ada Lovelace', color: '#0E9F6E' },
	me: { name: 'You', color: '#EC5E41' },
}
const resolveAuthor = (id: string): CommentAuthor => AUTHORS[id] ?? { name: id }

const PIN_CORNERS = {
	'top-left': { x: 0, y: 0 },
	'top-right': { x: 1, y: 0 },
	'bottom-left': { x: 0, y: 1 },
	'bottom-right': { x: 1, y: 1 },
} as const

type PinCornerName = keyof typeof PIN_CORNERS

// [1]
interface RegionConfig {
	enableRegions: boolean
	regionReveal: CommentingOptions['regionReveal']
	regionMove: CommentingOptions['regionMove']
	regionResize: CommentingOptions['regionResize']
	pinCorner: PinCornerName
}

const DEFAULT_CONFIG: RegionConfig = {
	enableRegions: true,
	regionReveal: 'pointer',
	regionMove: 'pin',
	regionResize: 'corners',
	pinCorner: 'bottom-right',
}

function ChoiceRow<T extends string>({
	label,
	values,
	value,
	onSelect,
}: {
	label: string
	values: readonly T[]
	value: T
	onSelect(value: T): void
}) {
	return (
		<div className="comment-regions-row">
			<span className="comment-regions-label">{label}</span>
			{values.map((v) => (
				<TldrawUiButton
					key={v}
					type={v === value ? 'primary' : 'normal'}
					onClick={() => onSelect(v)}
				>
					<TldrawUiButtonLabel>{v}</TldrawUiButtonLabel>
				</TldrawUiButton>
			))}
		</div>
	)
}

// [2]
function RegionControls({
	config,
	onChange,
}: {
	config: RegionConfig
	onChange(config: RegionConfig): void
}) {
	const set = (patch: Partial<RegionConfig>) => onChange({ ...config, ...patch })
	return (
		<div className="tlui-menu comment-regions-controls">
			<ChoiceRow
				label="regions"
				values={['on', 'off']}
				value={config.enableRegions ? 'on' : 'off'}
				onSelect={(v) => set({ enableRegions: v === 'on' })}
			/>
			<ChoiceRow
				label="reveal"
				values={['pointer', 'pin-hover', 'open']}
				value={config.regionReveal}
				onSelect={(regionReveal) => set({ regionReveal })}
			/>
			<ChoiceRow
				label="move"
				values={['pin', 'body', 'both']}
				value={config.regionMove}
				onSelect={(regionMove) => set({ regionMove })}
			/>
			<ChoiceRow
				label="resize"
				values={['corners', 'edges', 'none']}
				value={config.regionResize}
				onSelect={(regionResize) => set({ regionResize })}
			/>
			<ChoiceRow
				label="pin corner"
				values={Object.keys(PIN_CORNERS) as PinCornerName[]}
				value={config.pinCorner}
				onSelect={(pinCorner) => set({ pinCorner })}
			/>
		</div>
	)
}

const components: TLComponents = {
	InFrontOfTheCanvas: () => <CanvasComments currentUserId="me" resolveAuthor={resolveAuthor} />,
}

// [3]
const handleMount = (editor: Editor) => {
	if (editor.getCurrentPageShapeIds().size === 0) {
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
						'This thread is anchored to a region covering both shapes. Use the panel above to change how regions reveal, move, and resize.'
					),
				})
				putCommentRecords(editor, [thread, comment])
			},
			{ history: 'ignore' }
		)
	}
	editor.zoomToBounds({ x: 40, y: 40, w: 600, h: 420 }, { immediate: true })
}

export default function CommentRegionsExample() {
	const [config, setConfig] = useState(DEFAULT_CONFIG)

	// Comments live in the editor's own store as records; sharing one store across config switches
	// keeps the seeded region and every placed thread while the tool is reconfigured.
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	// [4]
	const tools = useMemo(
		() => [
			CommentTool.configure({
				enableRegions: config.enableRegions,
				regionReveal: config.regionReveal,
				regionMove: config.regionMove,
				regionResize: config.regionResize,
				regionPinCorner: PIN_CORNERS[config.pinCorner],
			}),
		],
		[config]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw
				// Commenting options are fixed at tool registration (`CommentTool.configure`), so
				// changing the config remounts the editor with the newly configured tool. The shared
				// store carries the comments across.
				key={JSON.stringify(config)}
				// Commenting is a licensed feature. Every feature is enabled in local development, but a
				// deployed app needs a license key that includes commenting — swap in your own key here.
				licenseKey={getLicenseKey()}
				store={store}
				onMount={handleMount}
				tools={tools}
				overrides={[commentToolOverrides]}
				components={components}
			>
				<RegionControls config={config} onChange={setConfig} />
			</Tldraw>
		</div>
	)
}

/*
[1]
The five region options, held as plain React state. Region commenting is off by default; this
example starts with it on. `pinCorner` is kept as a named corner and mapped to the normalized
`regionPinCorner` offset when the tool is configured.

[2]
One row per region option: whether dragging the comment tool out creates a region at all, when
the dashed box and its handles reveal, whether the region is moved by its pin or its body, which
resize handles it offers, and which corner the pin and composer sit on.

[3]
Seed a region thread covering two shapes so there's a region to play with immediately. A region
anchor is a page-fixed rectangle — it covers the shapes visually but isn't attached to them.
Select the comment tool (or press `c`) and drag to create more. Seeding is guarded so it runs
once, not on every config remount.

[4]
Region options are part of `CommentingOptions`, passed once via `CommentTool.configure` like the
rest of the commenting configuration. Anything unset falls back to the defaults in
`defaultCommentingOptions`.
*/
