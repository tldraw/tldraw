import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { react, useEditor, useValue } from 'tldraw'
import {
	type Corpus,
	detailNode,
	detailZoom,
	type Layout,
	levelOpacities,
	type PlacedNode,
} from './layout'
import { openNode } from './navigation'

/** Font size every node is laid out at before its own transform scales it. */
const LOGICAL_FONT = 16

/**
 * How much later the rules between cells arrive than the text they divide.
 *
 * A hairline reads as present at an opacity where text still reads as absent, so
 * sharing one number makes the grid seem to snap in ahead of the level it
 * belongs to. Raising the rules to a power holds them back until their level is
 * most of the way in.
 */
const RULE_GAMMA = 2.6

/**
 * Writes one opacity per level onto the editor container as a CSS variable.
 * Every node at a depth shares that depth's opacity, so the crossfade costs one
 * style write per camera frame instead of a React render per node.
 */
function useLevelOfDetail(nominals: number[]) {
	const editor = useEditor()
	useLayoutEffect(() => {
		const container = editor.getContainer()
		return react('semantic zoom level of detail', () => {
			const opacities = levelOpacities(nominals, editor.getZoomLevel())
			for (let depth = 0; depth < opacities.length; depth++) {
				const opacity = opacities[depth]
				container.style.setProperty(`--lod-${depth}`, opacity.toFixed(3))
				// Fully faded levels must stop painting, not just go transparent —
				// one level alone can be hundreds of blocks of text.
				container.style.setProperty(`--lod-${depth}-vis`, opacity < 0.005 ? 'hidden' : 'visible')

				const rule = Math.pow(opacity, RULE_GAMMA)
				container.style.setProperty(`--rule-${depth}`, rule.toFixed(3))
				container.style.setProperty(`--rule-${depth}-vis`, rule < 0.005 ? 'hidden' : 'visible')
			}
		})
	}, [editor, nominals])
}

function NodeView({
	node,
	matched,
	onSelect,
}: {
	node: PlacedNode
	matched: boolean
	onSelect?(node: PlacedNode): void
}) {
	const scale = node.fontSize / LOGICAL_FONT
	return (
		<div
			className={`sz-node sz-node--depth-${node.depth}` + (matched ? ' sz-node--match' : '')}
			style={{
				transform: `translate(${node.rect.x}px, ${node.rect.y}px) scale(${scale})`,
				width: node.rect.w / scale,
				height: node.rect.h / scale,
				fontSize: LOGICAL_FONT,
				columnCount: node.columns,
				opacity: `var(--lod-${node.depth})`,
				visibility: `var(--lod-${node.depth}-vis)` as CSSProperties['visibility'],
			}}
			onPointerDown={
				onSelect &&
				((e) => {
					e.stopPropagation()
					onSelect(node)
				})
			}
		>
			{node.title && <h2 className="sz-title">{node.title}</h2>}
			{node.text.split('\n\n').map((paragraph, i) => (
				<p key={i}>{paragraph}</p>
			))}
		</div>
	)
}

export function ContentLayer({
	layout,
	corpus,
	matches,
}: {
	layout: Layout
	corpus: Corpus
	matches: ReadonlySet<string>
}) {
	const editor = useEditor()
	useLevelOfDetail(layout.nominals)

	const loadZoom = useMemo(() => detailZoom(layout.nominals), [layout])
	const isDeep = useValue('is deep', () => editor.getZoomLevel() >= loadZoom, [editor, loadZoom])

	const [detail, setDetail] = useState<Record<string, string> | null>(null)
	useEffect(() => {
		if (!isDeep || detail || !corpus.loadDetail) return
		let cancelled = false
		corpus.loadDetail().then((loaded) => {
			if (!cancelled) setDetail(loaded)
		})
		return () => {
			cancelled = true
		}
	}, [isDeep, detail, corpus])

	// Returns a string so that panning within the same few leaves doesn't produce
	// a new array identity and re-render the whole layer.
	const visibleLeafIds = useValue(
		'visible leaves',
		() => {
			if (editor.getZoomLevel() < loadZoom) return ''
			const viewport = editor.getViewportPageBounds()
			return layout.leaves
				.filter(
					({ rect }) =>
						rect.x < viewport.maxX &&
						rect.x + rect.w > viewport.minX &&
						rect.y < viewport.maxY &&
						rect.y + rect.h > viewport.minY
				)
				.map((leaf) => leaf.id)
				.join(',')
		},
		[editor, layout, loadZoom]
	)

	const detailLevels = useMemo(() => {
		if (!detail || !visibleLeafIds) return []
		const wanted = new Set(visibleLeafIds.split(','))
		return layout.leaves
			.filter((leaf) => wanted.has(leaf.id))
			.flatMap((leaf) => {
				const text = detail[leaf.detailKey!]
				return text ? [detailNode(leaf, text)] : []
			})
	}, [detail, visibleLeafIds, layout])

	// Clicking text navigates, but only while the select tool is active. With any
	// drawing tool the layer stops taking pointers, so the whole work stays a
	// surface you can annotate rather than a wall of buttons.
	const isSelecting = useValue('is selecting', () => editor.getCurrentToolId() === 'select', [
		editor,
	])
	// A click means "open this", so it settles where the node's *children* are
	// the level being read. Settling on the node's own level would be a no-op on
	// the very node the reader is already looking at, which is the one they just
	// clicked; fitting the cell to the viewport would stop part-way through the
	// change, because box size and type size are different measures.
	const onSelect = isSelecting ? (node: PlacedNode) => openNode(editor, layout, node) : undefined

	return (
		<div className={`sz-layer${isSelecting ? ' sz-layer--interactive' : ''}`}>
			{layout.separators.map((rule, i) => (
				<div
					key={i}
					className="sz-rule"
					style={{
						transform: `translate(${rule.x}px, ${rule.y}px)`,
						width: rule.w,
						height: rule.h,
						opacity: `var(--rule-${rule.depth})`,
						visibility: `var(--rule-${rule.depth}-vis)` as CSSProperties['visibility'],
					}}
				/>
			))}
			{layout.nodes.map((node) => (
				<NodeView key={node.id} node={node} matched={matches.has(node.id)} onSelect={onSelect} />
			))}
			{detailLevels.map((node) => (
				<NodeView key={node.id} node={node} matched={false} />
			))}
		</div>
	)
}
